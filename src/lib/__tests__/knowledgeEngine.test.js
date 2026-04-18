import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStagingEntry } from '@/lib/knowledgeEngine';

describe('knowledgeEngine - createStagingEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a standard staging entry with required fields', () => {
    const input = {
      content: 'This is a test document.',
      title: 'My Test Doc',
      type: 'text',
      source: 'api',
      classification: {
        category: 'skill',
        suggestedTitle: 'A Suggested Title'
      }
    };

    const entry = createStagingEntry(input);

    expect(entry.id).toMatch(/^ing_\d+_[a-z0-9]{6}$/);
    // Uses suggestedTitle over title
    expect(entry.title).toBe('A Suggested Title');
    expect(entry.type).toBe('text');
    expect(entry.source).toBe('api');
    expect(entry.content).toBe('This is a test document.');
    expect(entry.contentLength).toBe(24);
    expect(entry.classification).toEqual(input.classification);
    expect(entry.status).toBe('staged');
    expect(entry.createdAt).toBe('2024-01-01T10:00:00.000Z');
    expect(entry.reviewedAt).toBeNull();
    expect(entry.approvedAt).toBeNull();
    expect(entry.reviewNotes).toEqual([]);
  });

  it('falls back to provided title if suggestedTitle is missing', () => {
    const entry = createStagingEntry({
      content: 'Hello',
      title: 'Fallback Title',
      type: 'text'
    });

    expect(entry.title).toBe('Fallback Title');
  });

  it('falls back to "Untitled" if both title and suggestedTitle are missing', () => {
    const entry = createStagingEntry({
      content: 'Hello',
      type: 'text'
    });

    expect(entry.title).toBe('Untitled');
  });

  it('falls back to "manual" source if source is not provided', () => {
    const entry = createStagingEntry({
      content: 'Hello',
      type: 'text'
    });

    expect(entry.source).toBe('manual');
  });

  it('truncates content to 50,000 characters', () => {
    const longContent = 'A'.repeat(60000);
    const entry = createStagingEntry({
      content: longContent,
      type: 'text'
    });

    expect(entry.content).toBe('A'.repeat(50000));
    expect(entry.content.length).toBe(50000);
    // contentLength should reflect the ORIGINAL length
    expect(entry.contentLength).toBe(60000);
  });
});
