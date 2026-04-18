import { describe, it, expect, vi } from 'vitest';
import { sendGmail } from '../googleAuth.js';

// Mock the unexported googleApiRequest by mocking fetch, since googleApiRequest relies on it
// Actually, it's easier to just mock the global fetch to capture what's being sent
global.fetch = vi.fn();

describe('sendGmail', () => {
  it('sanitizes newline characters from email headers to prevent injection', async () => {
    // Arrange
    const mockAccessToken = 'fake-token';
    const maliciousTo = 'victim@example.com\r\nBcc: attacker@example.com';
    const maliciousSubject = 'Hello\n\nMalicious content...';
    const body = 'This is the legitimate body.';

    // Setup mock response for fetch to return a dummy json
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'mock-message-id' }),
    });

    // Act
    await sendGmail(mockAccessToken, {
      to: maliciousTo,
      subject: maliciousSubject,
      body: body,
    });

    // Assert
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchArgs = global.fetch.mock.calls[0];
    const url = fetchArgs[0];
    const options = fetchArgs[1];

    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');

    // Extract the raw base64url payload
    const bodyObj = JSON.parse(options.body);
    const rawPayload = bodyObj.raw;

    // Revert base64url encoding to decode the string
    let base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decodedEmail = atob(base64);

    // Check if the sanitization worked
    expect(decodedEmail).toContain('To: victim@example.comBcc: attacker@example.com');
    expect(decodedEmail).toContain('Subject: HelloMalicious content...');
    expect(decodedEmail).not.toContain('\r\nBcc: attacker@example.com');
  });
});
