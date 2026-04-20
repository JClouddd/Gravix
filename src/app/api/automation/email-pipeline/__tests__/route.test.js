import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route.js';

vi.mock('@/lib/automationEngine', () => ({
  triggerPipeline: vi.fn().mockResolvedValue([{ action: 'linkToClient', result: 'linked' }])
}));
vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn()
}));
vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 5)))
    }),
    collection: vi.fn().mockReturnValue({
      add: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: 'mock-doc-id' }), 5))),
      doc: vi.fn().mockReturnValue({ id: 'mock-doc-id' })
    }),
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false })
    })
  }
}));

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
