import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAuthUrl } from '../googleAuth';

describe('getAuthUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw an error if GOOGLE_OAUTH_CLIENT_ID is not configured', () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;

    expect(() => getAuthUrl('http://localhost/callback')).toThrow(
      'GOOGLE_OAUTH_CLIENT_ID not configured. Set up OAuth consent screen in GCP Console first.'
    );
  });

  it('should generate a valid OAuth consent URL with correct parameters', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    const redirectUri = 'http://localhost/callback';

    const url = getAuthUrl(redirectUri);

    expect(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(true);

    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    expect(searchParams.get('client_id')).toBe('test-client-id');
    expect(searchParams.get('redirect_uri')).toBe(redirectUri);
    expect(searchParams.get('response_type')).toBe('code');
    expect(searchParams.get('access_type')).toBe('offline');
    expect(searchParams.get('prompt')).toBe('consent');
    expect(searchParams.get('state')).toBe('gravix_oauth');

    // Check scopes (split by space to match how they are joined)
    const scope = searchParams.get('scope');
    expect(scope).toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(scope).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(scope).toContain('https://www.googleapis.com/auth/tasks');
  });
});
