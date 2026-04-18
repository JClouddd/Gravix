/**
 * googleAuth.js — Google OAuth 2.0 handler for Workspace APIs
 *
 * Handles OAuth flow for:
 * - Gmail API (read/send emails)
 * - Google Calendar API (read/create events)
 * - Google Tasks API (read/create tasks)
 * - Google Meet API (read transcripts)
 *
 * Flow:
 * 1. User clicks "Connect Gmail" → redirects to Google consent
 * 2. Google redirects back with auth code
 * 3. We exchange code for tokens
 * 4. Tokens stored in Firestore (encrypted at rest)
 * 5. API calls use the stored refresh token
 */

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks.readonly",
  "https://www.googleapis.com/auth/tasks",
].join(" ");

/**
 * Generate the OAuth consent URL
 */
export function getAuthUrl(redirectUri) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured. Set up OAuth consent screen in GCP Console first.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: "gravix_oauth",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange auth code for access + refresh tokens
 */
export async function exchangeCode(code, redirectUri) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Make an authenticated request to a Google API
 */
export async function googleApiRequest(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API request failed (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Get Gmail inbox messages
 */
export async function getGmailInbox(accessToken, maxResults = 20) {
  const messages = await googleApiRequest(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`
  );

  if (!messages.messages) return [];

  // Fetch full message details for each
  const detailed = await Promise.all(
    messages.messages.slice(0, 10).map(async (msg) => {
      const full = await googleApiRequest(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      );
      const headers = full.payload?.headers || [];
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: headers.find((h) => h.name === "From")?.value || "",
        subject: headers.find((h) => h.name === "Subject")?.value || "",
        date: headers.find((h) => h.name === "Date")?.value || "",
        snippet: full.snippet || "",
        isRead: !full.labelIds?.includes("UNREAD"),
      };
    })
  );

  return detailed;
}

/**
 * Send a Gmail message
 */
export async function sendGmail(accessToken, { to, subject, body }) {
  const raw = btoa(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return googleApiRequest(
    accessToken,
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      body: JSON.stringify({ raw }),
    }
  );
}

/**
 * Get Calendar events
 */
export async function getCalendarEvents(accessToken, maxResults = 10) {
  const now = new Date().toISOString();
  return googleApiRequest(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${now}&orderBy=startTime&singleEvents=true`
  );
}

/**
 * Get Tasks lists and items
 */
export async function getTaskLists(accessToken) {
  return googleApiRequest(
    accessToken,
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists"
  );
}

export async function getTasks(accessToken, taskListId = "@default") {
  return googleApiRequest(
    accessToken,
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`
  );
}

export async function updateTask(accessToken, taskListId, taskId, data) {
  return googleApiRequest(
    accessToken,
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

const defaultExport = {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  googleApiRequest,
  getGmailInbox,
  sendGmail,
  getCalendarEvents,
  getTaskLists,
getTasks,
  updateTask,
  SCOPES,
};
export default defaultExport;
