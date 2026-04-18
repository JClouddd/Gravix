import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../ingest/route.js';
import { classifyContent, processUrl, createStagingEntry } from '@/lib/knowledgeEngine';

vi.mock('@/lib/knowledgeEngine', () => ({
  classifyContent: vi.fn(),
  processUrl: vi.fn(),
  createStagingEntry: vi.fn(),
}));

describe('POST /api/knowledge/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required fields (missing content)', async () => {
    const req = {
      json: async () => ({ type: 'text', title: 'Test' })
    };
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('content is required (text, URL, or file content)');
  });

  it('processes text content and returns staging entry', async () => {
    const mockClassification = {
      category: 'skill',
      confidence: 0.9,
      summary: 'Test summary',
      tags: ['test']
    };

    const mockEntry = {
      id: 'ing_123',
      title: 'Test Title',
      type: 'text',
      status: 'staged'
    };

    classifyContent.mockResolvedValueOnce(mockClassification);
    createStagingEntry.mockReturnValueOnce(mockEntry);

    const req = {
      json: async () => ({
        content: 'This is a test document',
        type: 'text',
        title: 'Test Title',
        source: 'manual'
      })
    };

    const response = await POST(req);
    const data = await response.json();

    expect(classifyContent).toHaveBeenCalledWith('This is a test document', 'Test Title');
    expect(createStagingEntry).toHaveBeenCalledWith({
      content: 'This is a test document',
      title: 'Test Title',
      type: 'text',
      source: 'manual',
      classification: mockClassification
    });

    expect(data.success).toBe(true);
    expect(data.entry).toEqual({
      id: 'ing_123',
      title: 'Test Title',
      type: 'text',
      category: 'skill',
      confidence: 0.9,
      summary: 'Test summary',
      tags: ['test'],
      status: 'staged',
      crossref: null
    });
    expect(data.message).toContain('Content staged for review');
  });

  it('processes URL content and delegates to ingest-url', async () => {
    // Mock the global fetch for the internal call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        ingested: true,
        title: 'URL Title',
        summary: 'URL summary',
        wordCount: 100,
        classification: {
          category: 'workflow',
          confidence: 0.85,
          summary: 'URL summary',
          tags: ['url-test']
        },
        entry: {
          id: 'ing_url_456',
          title: 'URL Title',
          type: 'url',
          status: 'staged'
        }
      })
    });

    const req = {
      url: 'http://localhost/api/knowledge/ingest',
      json: async () => ({
        content: 'https://example.com',
        type: 'url',
        title: 'URL Title',
        source: 'auto'
      })
    };

    const response = await POST(req);
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost/api/knowledge/ingest-url', expect.any(Object));

    expect(data.success).toBe(true);
    expect(data.entry).toEqual({
      id: 'ing_url_456',
      title: 'URL Title',
      type: 'url',
      status: 'staged'
    });
  });

  it('handles errors gracefully and returns 500', async () => {
    const errorMsg = 'Processing failed';
    classifyContent.mockRejectedValueOnce(new Error(errorMsg));

    const req = {
      url: 'http://localhost/api/knowledge/ingest',
      json: async () => ({
        content: 'Failing content',
        type: 'text',
        title: 'Fail'
      })
    };

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(errorMsg);
  });

  it('processes file content and returns staging entry', async () => {
    const mockClassification = {
      category: 'skill',
      confidence: 0.9,
      summary: 'Test summary',
      tags: ['test']
    };

    const mockEntry = {
      id: 'ing_file_123',
      title: 'my_file.txt',
      type: 'file',
      status: 'staged'
    };

    classifyContent.mockResolvedValueOnce(mockClassification);
    createStagingEntry.mockReturnValueOnce(mockEntry);

    const base64Content = Buffer.from('File content').toString('base64');

    const req = {
      url: 'http://localhost/api/knowledge/ingest',
      json: async () => ({
        content: base64Content,
        type: 'file',
        fileName: 'my_file.txt',
        source: 'manual'
      })
    };

    const response = await POST(req);
    const data = await response.json();

    expect(classifyContent).toHaveBeenCalledWith('File content', 'my_file.txt');
    expect(createStagingEntry).toHaveBeenCalledWith({
      content: 'File content',
      title: 'my_file.txt',
      type: 'file',
      source: 'manual',
      classification: mockClassification
    });

    expect(data.success).toBe(true);
    expect(data.entry).toEqual({
      id: 'ing_file_123',
      title: 'my_file.txt',
      type: 'file',
      category: 'skill',
      confidence: 0.9,
      summary: 'Test summary',
      tags: ['test'],
      status: 'staged',
      crossref: null
    });
  });
});
