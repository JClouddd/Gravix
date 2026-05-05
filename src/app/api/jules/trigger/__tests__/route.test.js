import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import { triggerTask } from '@/lib/julesClient';

vi.mock('@/lib/julesClient', () => ({
  triggerTask: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('Mocked GEMINI.md'),
}));

vi.mock('path', () => ({
  join: vi.fn().mockReturnValue('/mocked/path/GEMINI.md'),
}));

vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));

vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: true,
            forEach: vi.fn(),
          }),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/geminiClient', () => ({
  generate: vi.fn().mockResolvedValue({ text: 'Mocked sniper context' }),
}));

// Mock fetch for Deerflow middleware check
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: false }) // simulate no revised plan to keep it simple
});

describe('Jules Trigger API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns empty queue status (deprecated lock system)', async () => {
      const response = await GET();
      const data = await response.json();
      expect(data).toEqual({
        active: 0,
        queued: 0,
        activeLocks: [],
        queuedTasks: [],
      });
    });
  });

  describe('POST', () => {
    it('returns 400 if prompt is missing', async () => {
      const request = new Request('http://localhost:3000/api/jules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({ error: 'prompt is required' });
    });

    it('successfully triggers task when prompt is provided', async () => {
      triggerTask.mockResolvedValueOnce({
        sessionId: 'session-123',
        status: 'CREATED',
        message: 'Mocked response'
      });

      const request = new Request('http://localhost:3000/api/jules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'host': 'localhost:3000' },
        body: JSON.stringify({
          prompt: 'Do something',
          title: 'Test Title',
          files: ['src/file1.js'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200); // Response.json() defaults to 200

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe('session-123');

      // verify that triggerTask was called
      expect(triggerTask).toHaveBeenCalledTimes(1);
      const args = triggerTask.mock.calls[0][0];

      expect(args.title).toBe('Test Title');
      expect(args.prompt).toContain('Do something');
      expect(args.prompt).toContain('Mocked sniper context');
      expect(args.prompt).toContain('src/file1.js');
    });

    it('handles triggerTask API Key errors', async () => {
      triggerTask.mockRejectedValueOnce(new Error('JULES_API_KEY missing'));

      const request = new Request('http://localhost:3000/api/jules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('JULES_API_KEY not configured');
    });

    it('handles generic triggerTask errors', async () => {
      triggerTask.mockRejectedValueOnce(new Error('Internal oops'));

      const request = new Request('http://localhost:3000/api/jules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal oops');
    });
  });
});
