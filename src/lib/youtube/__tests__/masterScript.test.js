import { describe, it, expect, vi } from 'vitest';
import { generateMasterScript } from '@/lib/youtube/masterScript';
import { generate, structuredGenerate } from '@/lib/geminiClient';

vi.mock('@/lib/geminiClient', () => ({
  generate: vi.fn(),
  structuredGenerate: vi.fn(),
}));

describe('generateMasterScript', () => {
  it('should generate a script given a topic and audience', async () => {
    const mockResponse = {
      text: JSON.stringify({
        titles: ['A'],
        keywords: ['B'],
        outline: { hook: 'C', intro: 'D', body: ['E'], outro: 'F', cta: 'G' },
        talkingPoints: ['H'],
        estimatedLength: 'I'
      })
    };
    structuredGenerate.mockResolvedValue(mockResponse);

    const result = await generateMasterScript('Topic', 'Audience');

    expect(structuredGenerate).toHaveBeenCalled();
    expect(result.titles[0]).toBe('A');
  });
});
