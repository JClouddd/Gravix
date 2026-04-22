import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate } from '../geminiClient';

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      getGenerativeModel(config) {
        return mockGetGenerativeModel(config);
      }
    }
  };
});

describe('geminiClient - generate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error if GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generate({ prompt: 'hello' })).rejects.toThrow('GEMINI_API_KEY environment variable is not set');
  });

  it('calls generateContent and returns properly formatted result for base case', async () => {
    const mockResponse = {
      response: {
        text: () => 'Hello there!',
        functionCalls: () => [],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      }
    };

    // We mock the return value for generateContent. We just use a mocked object instead of vi.fn directly if we want to trace it.
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    const result = await generate({ prompt: 'hello' });

    expect(result.text).toBe('Hello there!');
    expect(result.tokens.input).toBe(10);
    expect(result.tokens.output).toBe(5);
    expect(result.tokens.total).toBe(15);
    expect(result.modelTier).toBe('flash');
    expect(result.cost.modelTier).toBe('flash');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 8192 }
    }));
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }]
    });
  });

  it('passes temperature properly to generationConfig', async () => {
    const mockResponse = {
      response: {
        text: () => 'Hot response',
        usageMetadata: {}
      }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    await generate({ prompt: 'hello', temperature: 1.5 });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      generationConfig: expect.objectContaining({ temperature: 1.5 })
    }));
  });

  it('passes JSON schema and sets responseMimeType when jsonSchema is provided', async () => {
    const mockResponse = {
      response: {
        text: () => '{"foo": "bar"}',
        usageMetadata: {}
      }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    const schema = { type: "object", properties: { foo: { type: "string" } } };
    await generate({ prompt: 'hello', jsonSchema: schema });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      generationConfig: expect.objectContaining({
        responseMimeType: "application/json",
        responseSchema: schema
      })
    }));
  });

  it('adds googleSearchRetrieval tool when grounded is true', async () => {
    const mockResponse = {
      response: {
        text: () => 'Grounded response',
        usageMetadata: {},
        candidates: [{
          groundingMetadata: { webSearchQueries: ["test query"] }
        }]
      }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    const result = await generate({ prompt: 'hello', grounded: true });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      tools: [{ googleSearchRetrieval: {} }]
    }));
    expect(result.grounded).toBe(true);
    expect(result.groundingMetadata).toEqual({ webSearchQueries: ["test query"] });
  });

  it('sets thinkingConfig based on thinkingLevel', async () => {
    const mockResponse = {
      response: { text: () => 'Thinking...', usageMetadata: {} }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    await generate({ prompt: 'deep thought', thinkingLevel: 'high' });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      generationConfig: expect.objectContaining({
        thinkingConfig: { thinkingBudget: 16384 }
      })
    }));
  });

  it('sets deep reasoning and thinkingConfig when model is deep', async () => {
    const mockResponse = {
      response: { text: () => 'Deep research', usageMetadata: {} }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    await generate({ prompt: 'deep research', complexity: 'deep' });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-pro', // Deep uses Pro under the hood
      generationConfig: expect.objectContaining({
        thinkingConfig: { thinkingBudget: 4096 } // Default fallback when not explicitly provided
      })
    }));
  });

  it('includes systemPrompt if provided', async () => {
    const mockResponse = {
      response: { text: () => 'Yes sir', usageMetadata: {} }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    await generate({ prompt: 'hello', systemPrompt: 'You are a bot.' });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
      systemInstruction: 'You are a bot.'
    }));
  });

  it('appends conversation history to contents array properly', async () => {
    const mockResponse = {
      response: { text: () => 'History test', usageMetadata: {} }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    const history = [
      { role: 'user', content: 'What is 1+1?' },
      { role: 'model', content: '2' }
    ];

    await generate({ prompt: 'What is 2+2?', history });

    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'What is 1+1?' }] },
        { role: 'model', parts: [{ text: '2' }] },
        { role: 'user', parts: [{ text: 'What is 2+2?' }] }
      ]
    });
  });

  it('retries when generateContent throws an error', async () => {
    const mockResponse = {
      response: { text: () => 'Recovered', usageMetadata: {} }
    };

    // First call rejects, second resolves
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockResponse);

    const result = await generate({ prompt: 'hello' });

    expect(result.text).toBe('Recovered');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('throws an error if max retries are exceeded', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Persistent Error'));

    await expect(generate({ prompt: 'hello' })).rejects.toThrow('Persistent Error');
    // maxRetries default is 3, so it tries 1 initial + 3 retries = 4 times.
    expect(mockGenerateContent).toHaveBeenCalledTimes(4);
  }, 15000); // Need higher timeout due to exponential backoff

  it('estimates costs properly for high usage with pro tier', async () => {
    const mockResponse = {
      response: {
        text: () => 'Costly response',
        usageMetadata: {
          promptTokenCount: 10000,
          candidatesTokenCount: 2000,
          totalTokenCount: 12000
        }
      }
    };
    mockGenerateContent.mockResolvedValueOnce(mockResponse);

    const result = await generate({ prompt: 'complex prompt', complexity: 'pro' });

    expect(result.modelTier).toBe('pro');
    expect(result.cost.modelTier).toBe('pro');
    // For 'pro': input 1.25 / 1M, output 10.00 / 1M
    // 10000 input tokens = 0.0125
    // 2000 output tokens = 0.02
    expect(result.cost.inputCost).toBe(0.0125);
    expect(result.cost.outputCost).toBe(0.02);
    expect(result.cost.totalCost).toBe(0.0325);
  });
});
