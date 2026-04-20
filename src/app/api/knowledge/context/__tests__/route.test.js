import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) })
      }),
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
      }),
      get: vi.fn().mockResolvedValue({ size: 0, docs: [] })
    })
  }
}));

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
