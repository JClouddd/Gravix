import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import { triggerTask } from '@/lib/julesClient';

vi.mock('@/lib/julesClient', () => ({
  triggerTask: vi.fn(),
}));

// Mock other dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('Mock GEMINI.md'),
}));
vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));
vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            empty: true,
            forEach: vi.fn(),
          })
        })
      })
    })
  }
}));
vi.mock('@/lib/geminiClient', () => ({
  generate: vi.fn().mockResolvedValue({ text: 'Mock Sniper Result' }),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Jules Trigger API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jules/trigger', () => {
    it('returns empty queues', async () => {
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

  describe('POST /api/jules/trigger', () => {
    it('returns 400 if prompt is missing', async () => {
      const req = {
        json: async () => ({})
      };
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('prompt is required');
    });

    it('triggers a Jules task successfully', async () => {
      triggerTask.mockResolvedValue({ sessionId: 'session-123' });
      global.fetch.mockResolvedValue({ ok: false }); // Bypass Deerflow mock

      const req = {
        json: async () => ({ prompt: 'test task' }),
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      };

      const response = await POST(req);
      const data = await response.json();

      expect(triggerTask).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe('session-123');
    });

    it('handles JULES_API_KEY errors', async () => {
      triggerTask.mockRejectedValue(new Error('JULES_API_KEY missing'));
      global.fetch.mockResolvedValue({ ok: false });

      const req = {
        json: async () => ({ prompt: 'test task' }),
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      };

      const response = await POST(req);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('JULES_API_KEY not configured');
    });
  });
});
