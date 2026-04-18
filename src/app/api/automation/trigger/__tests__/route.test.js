import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { triggerPipeline, pipelineRegistry } from '@/lib/automationEngine';

vi.mock('@/lib/automationEngine', () => ({
  triggerPipeline: vi.fn(),
  pipelineRegistry: {
    'test.event.exists': [vi.fn()]
  }
}));

describe('Automation Trigger API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/automation/trigger', () => {
    it('returns 400 if event is missing in request body', async () => {
      const req = {
        json: async () => ({ data: {} })
      };

      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Missing 'event' in request body.");
    });

    it('returns 400 if event is not found in pipeline registry', async () => {
      const req = {
        json: async () => ({ event: 'test.event.missing', data: {} })
      };

      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Event 'test.event.missing' not found in pipeline registry.");
    });

    it('calls triggerPipeline and returns success response (200) with results', async () => {
      const mockResults = [{ action: 'testAction', result: 'Success' }];
      triggerPipeline.mockResolvedValue(mockResults);

      const req = {
        json: async () => ({ event: 'test.event.exists', data: { foo: 'bar' } })
      };

      const response = await POST(req);
      expect(response.status).toBe(200); // 200 is default
      const data = await response.json();

      expect(triggerPipeline).toHaveBeenCalledWith('test.event.exists', { foo: 'bar' });
      expect(data.event).toBe('test.event.exists');
      expect(data.results).toEqual(mockResults);
      expect(data.timestamp).toBeDefined();
    });

    it('handles errors gracefully (500) if triggerPipeline throws an error', async () => {
      triggerPipeline.mockRejectedValue(new Error('Test error'));

      const req = {
        json: async () => ({ event: 'test.event.exists', data: {} })
      };

      const response = await POST(req);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Test error');
    });
  });
});
