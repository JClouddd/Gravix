import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import dns from 'dns';

// Mock dependencies
vi.mock('dns', () => ({
  default: {
    promises: {
      lookup: vi.fn(),
    },
  },
}));

vi.mock('@/lib/knowledgeEngine', () => ({
  classifyContent: vi.fn().mockResolvedValue({ summary: 'test summary', suggestedTitle: 'Test Title' }),
  createStagingEntry: vi.fn().mockReturnValue({ title: 'Test Title' }),
}));

// Mock global fetch
const originalFetch = global.fetch;

describe('POST /api/knowledge/ingest-url', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  const createRequest = (body) => {
    return {
      json: async () => body,
    };
  };

  it('should process a valid public URL', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><title>Example</title><body>Hello world</body></html>',
    });

    const request = createRequest({ url: 'https://example.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://example.com', { redirect: 'error' });
  });

  it('should block local hostnames (SSRF)', async () => {
    const request = createRequest({ url: 'http://localhost:3000/api/secret' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Access to local hostnames is forbidden');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block metadata hostname (SSRF)', async () => {
    const request = createRequest({ url: 'http://metadata.google.internal/computeMetadata/v1/' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Access to local hostnames is forbidden');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block loopback IP (SSRF)', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '127.0.0.1', family: 4 });
    const request = createRequest({ url: 'http://local.test.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('URL resolves to a private or local IP address');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block private network IP (SSRF)', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '192.168.1.5', family: 4 });
    const request = createRequest({ url: 'http://internal-tool.company.com' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('URL resolves to a private or local IP address');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block cloud metadata IP directly (SSRF)', async () => {
    dns.promises.lookup.mockResolvedValue({ address: '169.254.169.254', family: 4 });
    const request = createRequest({ url: 'http://169.254.169.254/latest/meta-data/' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('URL resolves to a private or local IP address');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block non-HTTP/HTTPS protocols', async () => {
    const request = createRequest({ url: 'file:///etc/passwd' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Only HTTP and HTTPS protocols are allowed');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
