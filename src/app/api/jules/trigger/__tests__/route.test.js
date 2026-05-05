import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { triggerTask } from '@/lib/julesClient';
import { generate } from '@/lib/geminiClient';
import { adminDb } from '@/lib/firebaseAdmin';
import { readFile } from 'fs/promises';

// Mock dependencies
vi.mock('@/lib/julesClient', () => ({
  triggerTask: vi.fn(),
}));

vi.mock('@/lib/geminiClient', () => ({
  generate: vi.fn(),
}));

vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('@/lib/firebaseAdmin', () => {
  const getMock = vi.fn().mockResolvedValue({
    empty: true,
    forEach: vi.fn(),
  });
  return {
    adminDb: {
      collection: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: getMock,
          })),
        })),
      })),
    },
  };
});

describe('Jules Trigger API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, evaluation: { status: "APPROVED", revisedPlan: "Test Plan" } })
    });
  });

  describe('GET /api/jules/trigger', () => {
    it('returns empty queues for backwards compatibility', async () => {
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
        json: async () => ({}),
      };
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('prompt is required');
    });

    it('successfully triggers a task', async () => {
      readFile.mockResolvedValue('Mock GEMINI.md content');
      generate.mockResolvedValue({ text: 'Mock sniper context' });
      triggerTask.mockResolvedValue({ sessionId: '123', status: 'CREATED' });

      const req = {
        headers: new Headers({
            'x-forwarded-proto': 'http',
            'host': 'localhost:3000'
        }),
        json: async () => ({
          prompt: 'Do a task',
          title: 'Test Task',
          files: ['src/file1.js'],
          acceptanceCriteria: 'Works perfectly',
        }),
      };

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200); // Response.json defaults to 200
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe('123');
      expect(triggerTask).toHaveBeenCalled();
    });
  });
});
