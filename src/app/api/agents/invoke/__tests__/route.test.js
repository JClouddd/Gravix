import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../[name]/route';
import { routeToAgent, listAgentTools } from '@/lib/agentEngine';

vi.mock('@/lib/agentEngine', () => ({
  routeToAgent: vi.fn(),
  listAgentTools: vi.fn()
}));

describe('Agent Invoke API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/agents/invoke/[name]', () => {
    it('returns 400 if message is missing', async () => {
      const req = {
        json: async () => ({ context: {} })
      };

      const response = await POST(req, { params: { name: 'scholar' } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('message is required');
    });

    it('calls routeToAgent and returns response', async () => {
      routeToAgent.mockResolvedValue({ status: 'ok', response: 'test response' });

      const req = {
        json: async () => ({ message: 'hello', context: { foo: 'bar' } })
      };

      const response = await POST(req, { params: { name: 'scholar' } });
      const data = await response.json();

      expect(routeToAgent).toHaveBeenCalledWith('hello', 'scholar', { foo: 'bar' });
      expect(data.response).toBe('test response');
    });

    it('handles errors gracefully', async () => {
      routeToAgent.mockRejectedValue(new Error('Test error'));

      const req = {
        json: async () => ({ message: 'hello' })
      };

      const response = await POST(req, { params: { name: 'scholar' } });
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Test error');
    });
  });

  describe('GET /api/agents/invoke/[name]', () => {
    it('returns agent tools', async () => {
      listAgentTools.mockResolvedValue([{ name: 'tool1' }]);

      const req = {};

      const response = await GET(req, { params: { name: 'scholar' } });
      const data = await response.json();

      expect(listAgentTools).toHaveBeenCalledWith('scholar');
      expect(data.agent).toBe('scholar');
      expect(data.tools).toEqual([{ name: 'tool1' }]);
    });

    it('handles errors gracefully', async () => {
      listAgentTools.mockRejectedValue(new Error('Test error'));

      const req = {};

      const response = await GET(req, { params: { name: 'scholar' } });
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Test error');
    });
  });
});
