import { describe, it, expect, vi } from 'vitest';
import { GET } from '../status/route.js';
import { DOCUMENTATION_SOURCES } from '@/lib/knowledgeEngine';

// Mock the module since we don't need to actually call it
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
      bucket: "gs://gravix-knowledge",
      region: "us-central1",
      deployed: false,
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
