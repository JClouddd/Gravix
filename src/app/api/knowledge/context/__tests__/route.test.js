import { vi } from 'vitest';
vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
  }
}));
import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('Knowledge Context API', () => {
  it('returns empty notebooks for domains=all', async () => {
    const req = {
      url: 'http://localhost/api/knowledge/context?domains=all'
    };
    const response = await GET(req);
    const data = await response.json();
    expect(data.notebooks).toEqual([]);
  });

  it('returns empty notebooks for other requests', async () => {
    const req = {
      url: 'http://localhost/api/knowledge/context'
    };
    const response = await GET(req);
    const data = await response.json();
    expect(data.notebooks).toEqual([]);
  });
});
