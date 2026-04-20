vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue({})
    }),
    collection: vi.fn().mockReturnValue({
      add: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
      doc: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ empty: false, docs: [{ id: 'client_1', data: () => ({ email: 'test@example.com' }) }] })
    }),
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn().mockResolvedValue({})
    })
  }
}));
vi.mock('@/lib/geminiClient', () => ({
  generate: vi.fn().mockResolvedValue('{"category": "inquiry"}')
}));
import { vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import { POST } from '../route.js';


describe('email-pipeline POST', () => {
  it('processes emails and measures time taken', async () => {
    const emails = [];
    for (let i = 0; i < 50; i++) {
      emails.push({
        id: `email-${i}`,
        from: `user${i}@example.com`,
        subject: `Test ${i}`,
        snippet: `Snippet ${i}`,
        category: 'client',
        urgency: 'normal',
      });
    }

    const mockRequest = {
      json: vi.fn().mockResolvedValue({ emails })
    };

    const start = Date.now();
    const res = await POST(mockRequest);
    const data = await res.json();
    const end = Date.now();

    console.log(`Optimized time: ${end - start}ms`);
    expect(res.status).toBe(200);
    expect(data.clientsLinked).toBe(50);
  });
});
