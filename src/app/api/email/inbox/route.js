import { getGmailInbox, refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * GET /api/email/inbox — Fetch real Gmail inbox or return not-connected status
 */
export async function GET() {
  try {
    // Check if OAuth tokens exist
    const tokensDoc = await getDoc(doc(db, "settings", "google_oauth"));

    if (!tokensDoc.exists()) {
      return Response.json({
        connected: false,
        message: "Gmail is not connected. Go to Settings → Integrations → Connect Gmail.",
        connectUrl: "/api/auth/connect",
        inbox: [],
        stats: { total: 0, unread: 0, actionRequired: 0, clientEmails: 0 },
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    // Refresh if expired
    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;

        // Update stored token
        await updateDoc(doc(db, "settings", "google_oauth"), {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        return Response.json({
          connected: false,
          message: "Token expired and refresh failed. Please reconnect Gmail.",
          connectUrl: "/api/auth/connect",
          inbox: [],
          stats: { total: 0, unread: 0, actionRequired: 0, clientEmails: 0 },
        });
      }
    }

    // Fetch real inbox
    const messages = await getGmailInbox(accessToken, 20);
    const unread = messages.filter((m) => !m.isRead).length;

    return Response.json({
      connected: true,
      inbox: messages,
      stats: {
        total: messages.length,
        unread,
        actionRequired: 0,
        clientEmails: 0,
      },
    });
  } catch (error) {
    console.error("[/api/email/inbox]", error);

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        message: "Gmail session expired. Please reconnect.",
        connectUrl: "/api/auth/connect",
        inbox: [],
        stats: { total: 0, unread: 0, actionRequired: 0, clientEmails: 0 },
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/email/inbox — Perform email actions
 */
export async function POST(request) {
  try {
    const { action, emailId, options = {} } = await request.json();

    if (!action) {
      return Response.json({ error: "action is required (fetch, classify, archive)" }, { status: 400 });
    }

    // Check OAuth
    const tokensDoc = await getDoc(doc(db, "settings", "google_oauth"));
    if (!tokensDoc.exists()) {
      return Response.json({
        connected: false,
        message: "Gmail API not connected. Go to Settings → Integrations → Connect Gmail.",
        connectUrl: "/api/auth/connect",
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    // Refresh if needed
    if (Date.now() > tokens.expiresAt) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;
      await updateDoc(doc(db, "settings", "google_oauth"), {
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    }

    // Handle actions
    if (action === "fetch") {
      const messages = await getGmailInbox(accessToken, options.maxResults || 20);
      return Response.json({ connected: true, inbox: messages });
    }

    if (action === "read" && emailId) {
      const message = await googleApiRequest(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`
      );
      return Response.json({ connected: true, message });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[/api/email/inbox]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
