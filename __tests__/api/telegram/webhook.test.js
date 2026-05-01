import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/telegram/webhook/route';
import { logRouteError } from '@/lib/errorLogger';

// Mock dependencies
vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Telegram Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_CHAT_ID = '123456789';
    process.env.TELEGRAM_DEVOPS_BOT_TOKEN = 'test-devops-token';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  const createRequest = (body, url = 'http://localhost:3000/api/telegram/webhook') => {
    return {
      json: async () => body,
      url,
    };
  };

  it('should return 200 OK without processing if message and Jules CI payload are missing', async () => {
    const req = createRequest({ update_id: 123 });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return 200 OK without processing if standard message chat_id does not match', async () => {
    const req = createRequest({
      message: {
        chat: { id: '999999999' },
        text: 'Hello',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should process Jules CI failed alerts and send Telegram message with retry button', async () => {
    const req = createRequest({
      sessionId: 'session-123',
      status: 'failed',
      title: 'Fix issue 42'
    });

    fetch.mockResolvedValueOnce({
      ok: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);

    expect(fetch).toHaveBeenCalledWith('https://api.telegram.org/bottest-devops-token/sendMessage', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        chat_id: '123456789',
        text: '🔴 Jules Task Failed: Fix issue 42',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Retry', callback_data: JSON.stringify({ action: 'retry', sessionId: 'session-123' }) }]
          ]
        }
      })
    }));
  });

  it('should proxy standard messages to the Orchestrator via fetch', async () => {
    const payload = {
      message: {
        chat: { id: '123456789' },
        text: 'Hello bot',
      },
    };
    const req = createRequest(payload);

    fetch.mockResolvedValueOnce({
      ok: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/agents/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining("Hello bot"),
    });
  });

  it('should catch errors and return 200 OK after logging', async () => {
    const req = createRequest({
      message: {
        chat: { id: '123456789' },
        text: 'Error test',
      },
    });

    const error = new Error('Test error');
    fetch.mockRejectedValueOnce(error);

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(logRouteError).toHaveBeenCalledWith(error, req);
  });
});
