import { describe, it, expect, vi } from 'vitest';
import { GET } from '../status/route.js';
import { DOCUMENTATION_SOURCES } from '@/lib/knowledgeEngine';

// Mock the module since we don't need to actually call it

vi.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) })
      }),
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
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
      engineId: "omni-knowledge-brain",
      id: "omni-knowledge-brain",
      project: "antigravity-hub-jcloud",
    });

    expect(data.stats).toBeDefined();
    expect(data.scheduler).toBeDefined();

    expect(data.scheduledSources).toEqual([
      {
        id: 'source1',
        name: 'Source 1',
        url: 'http://source1.com',
        status: "pending",
        lastIngested: null,
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
