import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/youtube/incubation/route';
import { generateMasterScript } from '@/lib/youtube/masterScript';

vi.mock('@/lib/youtube/masterScript', () => ({
  generateMasterScript: vi.fn(),
}));

vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));

describe('YouTube Incubation API Route', () => {
  it('should return 400 if topic is missing', async () => {
    const req = {
      json: vi.fn().mockResolvedValue({}),
    };

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required field: topic');
  });

  it('should generate a master script successfully', async () => {
    const mockScript = { titles: ['Title 1'] };
    generateMasterScript.mockResolvedValue(mockScript);

    const req = {
      json: vi.fn().mockResolvedValue({ topic: 'Test Topic' }),
    };

    const res = await POST(req);
    const data = await res.json();

    expect(generateMasterScript).toHaveBeenCalledWith('Test Topic', undefined);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockScript);
  });
});
