import { describe, it, expect, vi } from 'vitest';
import { GET } from '../status/route.js';
import { DOCUMENTATION_SOURCES } from '@/lib/knowledgeEngine';

// Mock the module since we don't need to actually call it

vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            documentsIngested: 10,
            documentsStaged: 5,
            documentsApproved: 5,
            videosIngested: 2,
            totalTokensUsed: 1000,
            lastIngest: { toDate: () => new Date('2023-01-01T00:00:00Z') }
          })
        })
      }),
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () => ({
                source: 'http://source1.com',
                createdAt: '2023-01-01T00:00:00Z'
              })
            }
          ]
        })
      })
    })
  }
}));

vi.mock('@/lib/knowledgeEngine', () => ({
  DOCUMENTATION_SOURCES: [
    { id: 'source1', name: 'Source 1', url: 'http://source1.com' },
    { id: 'source2', name: 'Source 2', url: 'http://source2.com' }
  ]
}));

describe('GET /api/knowledge/status', () => {
  it('returns correct structure with scheduledSources array', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('operational');
    expect(data.dataStore).toEqual({
      type: "vertex_ai",
      bucket: "gs://gravix-knowledge-docs",
      region: "global",
      deployed: true,
      engineId: "gravix-scholar",
      id: "gravix-knowledge",
      project: "antigravity-hub-jcloud",
    });

    expect(data.stats).toBeDefined();
    expect(data.scheduler).toBeDefined();

    expect(data.scheduledSources).toEqual([
      {
        id: 'source1',
        name: 'Source 1',
        url: 'http://source1.com',
        status: "ingested",
        lastIngested: '2023-01-01T00:00:00Z',
      },
      {
        id: 'source2',
        name: 'Source 2',
        url: 'http://source2.com',
        status: "pending",
        lastIngested: null,
      }
    ]);
  });
});
