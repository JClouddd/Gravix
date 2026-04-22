/**
 * googleAuth.js — Google OAuth 2.0 handler for Workspace APIs
 *
 * Handles OAuth flow for:
 * - Gmail API (read/send emails, modify labels)
 * - Google Calendar API (read/create events)
 * - Google Tasks API (read/create tasks)
 * - Google Meet REST API (read transcripts, list conferences)
 * - Google People API (read/create/search contacts)
 * - Google Drive API (list files)
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
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.meet.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
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
 * Get Gmail inbox messages with pagination support
 */
export async function getGmailInbox(accessToken, maxResults = 20, pageToken = null) {
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const messages = await googleApiRequest(accessToken, url);

  if (!messages.messages) return { emails: [], nextPageToken: null };

  // Fetch full message details for each
  const detailed = await Promise.all(
    messages.messages.map(async (msg) => {
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

  return { emails: detailed, nextPageToken: messages.nextPageToken || null };
}

/**
 * Send a Gmail message
 */
export async function sendGmail(accessToken, { to, subject, body }) {
  // Sanitize headers to prevent email header injection
  const safeTo = to.replace(/[\r\n]/g, "");
  const safeSubject = subject.replace(/[\r\n]/g, "");

  const raw = btoa(
    `To: ${safeTo}\r\nSubject: ${safeSubject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
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
 * List all calendars the user has access to
 */
export async function listCalendars(accessToken) {
  return googleApiRequest(
    accessToken,
    "https://www.googleapis.com/calendar/v3/users/me/calendarList"
  );
}

/**
 * Get events from multiple calendars
 * Returns events tagged with their calendar source
 */
export async function getCalendarEventsMulti(accessToken, calendarIds = ["primary"], maxResults = 25) {
  const now = new Date().toISOString();
  const maxTime = new Date();
  maxTime.setDate(maxTime.getDate() + 30); // Next 30 days
  const timeMax = maxTime.toISOString();

  const results = await Promise.allSettled(
    calendarIds.map(async (calId) => {
      const data = await googleApiRequest(
        accessToken,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?maxResults=${maxResults}&timeMin=${now}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`
      );
      return (data.items || []).map(evt => ({ ...evt, calendarId: calId }));
    })
  );

  return results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(accessToken, calendarId = "primary", event) {
  return googleApiRequest(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify(event),
    }
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

export async function listContacts(accessToken, pageSize = 100) {
  return googleApiRequest(accessToken, `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}&sortOrder=LAST_NAME_ASCENDING`);
}

export async function createContact(accessToken, contactData) {
  return googleApiRequest(accessToken, "https://people.googleapis.com/v1/people:createContact", { method: "POST", body: JSON.stringify(contactData) });
}

export async function searchContacts(accessToken, query) {
  return googleApiRequest(accessToken, `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=30`);
}

export async function listGmailLabels(accessToken) {
  return googleApiRequest(accessToken, "https://gmail.googleapis.com/gmail/v1/users/me/labels");
}

export async function createGmailLabel(accessToken, name, backgroundColor = "#4285f4", textColor = "#ffffff") {
  return googleApiRequest(accessToken, "https://gmail.googleapis.com/gmail/v1/users/me/labels", { method: "POST", body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show", color: { backgroundColor, textColor } }) });
}

export async function applyGmailLabel(accessToken, messageId, addLabelIds = [], removeLabelIds = []) {
  return googleApiRequest(accessToken, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds, removeLabelIds }) });
}

export async function listDriveFiles(accessToken, query = "", pageSize = 20) {
  let url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,thumbnailLink,parents)&orderBy=modifiedTime desc`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  return googleApiRequest(accessToken, url);
}

export async function listMeetConferences(accessToken) {
  return googleApiRequest(accessToken, "https://meet.googleapis.com/v2/conferenceRecords?pageSize=10");
}

export async function getMeetTranscript(accessToken, conferenceRecordId) {
  const transcripts = await googleApiRequest(accessToken, `https://meet.googleapis.com/v2/${conferenceRecordId}/transcripts`);
  if (!transcripts.transcripts?.length) return { entries: [] };
  const transcriptId = transcripts.transcripts[0].name;
  return googleApiRequest(accessToken, `https://meet.googleapis.com/v2/${transcriptId}/entries?pageSize=100`);
}

export function uploadToYouTube(accessToken, videoData) {
  throw new Error("Not Implemented");
}

const defaultExport = {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  googleApiRequest,
  getGmailInbox,
  sendGmail,
  getCalendarEvents,
  listCalendars,
  getCalendarEventsMulti,
  createCalendarEvent,
  getTaskLists,
  getTasks,
  updateTask,
  listContacts,
  createContact,
  searchContacts,
  listGmailLabels,
  createGmailLabel,
  applyGmailLabel,
  listDriveFiles,
  listMeetConferences,
  getMeetTranscript,
  uploadToYouTube,
  SCOPES,
};
export default defaultExport;
