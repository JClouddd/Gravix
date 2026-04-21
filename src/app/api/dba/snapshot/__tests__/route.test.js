import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import { adminDb } from '@/lib/firebaseAdmin';

vi.mock('@/lib/firebaseAdmin', () => {
  const collectionMock = {
    doc: vi.fn().mockReturnThis(),
    set: vi.fn(),
    update: vi.fn(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn()
  };
  return {
    adminDb: {
      collection: vi.fn(() => collectionMock)
    }
  };
});

vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn()
}));

const mockExportDocuments = vi.fn();
const mockOperationsGet = vi.fn();

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: class { constructor() {} }
      },
      firestore: vi.fn().mockImplementation(() => ({
        projects: {
          databases: {
            exportDocuments: mockExportDocuments,
            operations: {
              get: mockOperationsGet
            }
          }
        }
      }))
    }
  }
});

describe('DBA Snapshot Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('creates a snapshot successfully', async () => {
      mockExportDocuments.mockResolvedValueOnce({
        data: { name: 'operations/test-operation-123' }
      });
      const collectionMock = adminDb.collection();
      collectionMock.set.mockResolvedValueOnce({});

      const request = new Request('http://localhost');
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.backupId).toMatch(/^snapshot-\d+$/);

      expect(adminDb.collection).toHaveBeenCalledWith('dba_snapshots');
      expect(collectionMock.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending',
        operationName: 'operations/test-operation-123'
      }));
    });

    it('handles export errors safely', async () => {
      mockExportDocuments.mockRejectedValueOnce(new Error('Export failed'));
      const request = new Request('http://localhost');
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to trigger Firestore export');
    });
  });

  describe('GET', () => {
    it('verifies existing snapshot successfully and updates pending', async () => {
      const collectionMock = adminDb.collection();

      const updateMock = vi.fn();

      collectionMock.get
        .mockResolvedValueOnce({ // First get for pending
          empty: false,
          docs: [
            {
              data: () => ({ id: 'snapshot-123', status: 'pending', operationName: 'op-123' }),
              ref: { update: updateMock }
            }
          ]
        })
        .mockResolvedValueOnce({ // Second get for completed
          empty: false,
          docs: [
            {
              data: () => ({ id: 'snapshot-123', status: 'completed' })
            }
          ]
        });

      mockOperationsGet.mockResolvedValueOnce({
        data: { done: true }
      });

      const request = new Request('http://localhost');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.hasSnapshot).toBe(true);

      expect(mockOperationsGet).toHaveBeenCalledWith({ name: 'op-123' });
      expect(updateMock).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('handles empty snapshot collection', async () => {
      const collectionMock = adminDb.collection();
      collectionMock.get
        .mockResolvedValueOnce({ empty: true, docs: [] }) // pending
        .mockResolvedValueOnce({ empty: true, docs: [] }); // completed

      const request = new Request('http://localhost');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.hasSnapshot).toBe(false);
      expect(data.latestSnapshot).toBe(null);
    });
  });
});
