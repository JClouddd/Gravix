import { getGmailInbox, refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * GET /api/email/inbox — Fetch real Gmail inbox or return not-connected status
 */
export async function GET(request) {
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

    let classifiedMessages = messages;
    let actionRequired = 0;
    let clientEmails = 0;

    if (messages.length > 0) {
      try {
        const origin = new URL(request.url).origin;
        // Classify emails
        const classifyRes = await fetch(`${origin}/api/email/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: messages })
        });

        if (classifyRes.ok) {
          const { classifications } = await classifyRes.json();
          if (classifications && Array.isArray(classifications)) {
            classifiedMessages = messages.map(msg => {
              const classification = classifications.find(c => c.emailId === msg.id);
              if (classification) {
                if (classification.category === "action-required") actionRequired++;
                if (classification.category === "client") clientEmails++;
                return { ...msg, ...classification };
              }
              return msg;
            });

            // Trigger pipeline
            await fetch(`${origin}/api/automation/email-pipeline`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emails: classifiedMessages })
            });
          }
        }
      } catch (err) {
        console.error("Auto-classification pipeline error:", err);
      }
    }

    return Response.json({
      connected: true,
      inbox: classifiedMessages,
      stats: {
        total: classifiedMessages.length,
        unread,
        actionRequired,
        clientEmails,
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

      let classifiedMessages = messages;
      if (messages.length > 0) {
        try {
          const origin = new URL(request.url).origin;
          const classifyRes = await fetch(`${origin}/api/email/classify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: messages })
          });

          if (classifyRes.ok) {
            const { classifications } = await classifyRes.json();
            if (classifications && Array.isArray(classifications)) {
              classifiedMessages = messages.map(msg => {
                const classification = classifications.find(c => c.emailId === msg.id);
                return classification ? { ...msg, ...classification } : msg;
              });

              await fetch(`${origin}/api/automation/email-pipeline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails: classifiedMessages })
              });
            }
          }
        } catch (err) {
          console.error("Auto-classification pipeline error:", err);
        }
      }

      return Response.json({ connected: true, inbox: classifiedMessages });
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
