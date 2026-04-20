import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/telegram/webhook/route';
import { getHistory, appendHistory } from '@/lib/firestoreChatHistory';
import geminiClient from '@/lib/geminiClient';
import { logRouteError } from '@/lib/errorLogger';

// Mock dependencies
vi.mock('@/lib/firestoreChatHistory', () => ({
  getHistory: vi.fn(),
  appendHistory: vi.fn(),
}));

vi.mock('@/lib/geminiClient', () => ({
  default: {
    generate: vi.fn(),
  },
}));

vi.mock('@/lib/errorLogger', () => ({
  logRouteError: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Telegram Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_CHAT_ID = '123456789';
    process.env.TELEGRAM_ASSISTANT_BOT_TOKEN = 'test-bot-token';
  });

  const createRequest = (body) => {
    return {
      json: async () => body,
    };
  };

  it('should return 200 OK without processing if message is missing', async () => {
    const req = createRequest({ update_id: 123 });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(getHistory).not.toHaveBeenCalled();
    expect(geminiClient.generate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return 200 OK without processing if chat_id does not match', async () => {
    const req = createRequest({
      message: {
        chat: { id: '999999999' },
        text: 'Hello',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(getHistory).not.toHaveBeenCalled();
    expect(geminiClient.generate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should process the message, call Gemini, and send a response back', async () => {
    const req = createRequest({
      message: {
        chat: { id: '123456789' },
        text: 'Hello bot',
      },
    });

    const mockHistory = [{ role: 'user', content: 'Hi' }];
    getHistory.mockResolvedValue(mockHistory);

    geminiClient.generate.mockResolvedValue({
      text: 'Hello human',
    });

    fetch.mockResolvedValue({
      ok: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);

    expect(getHistory).toHaveBeenCalledWith('123456789');

    expect(appendHistory).toHaveBeenCalledWith('123456789', 'user', 'Hello bot');

    expect(geminiClient.generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Hello bot',
      history: mockHistory,
    }));

    expect(appendHistory).toHaveBeenCalledWith('123456789', 'model', 'Hello human');

    expect(fetch).toHaveBeenCalledWith('https://api.telegram.org/bottest-bot-token/sendMessage', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        chat_id: '123456789',
        text: 'Hello human',
      })
    }));
  });

  it('should catch errors and return 200 OK after logging', async () => {
    const req = createRequest({
      message: {
        chat: { id: '123456789' },
        text: 'Error test',
      },
    });

    const error = new Error('Test error');
    getHistory.mockRejectedValue(error);

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(logRouteError).toHaveBeenCalledWith(error, req);
  });
});