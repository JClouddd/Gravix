import { getGmailInbox, refreshAccessToken, googleApiRequest, listGmailLabels, createGmailLabel, applyGmailLabel } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/email/inbox — Fetch real Gmail inbox with pagination support
 * Query params: ?pageToken=xxx for infinite scroll
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken") || null;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        message: "Gmail is not connected. Go to Settings → Integrations → Connect Gmail.",
        connectUrl: "/api/auth/connect",
        inbox: [],
        nextPageToken: null,
        stats: { total: 0, unread: 0, actionRequired: 0, clientEmails: 0 },
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;
        await adminDb.collection("settings").doc("google_oauth").update({
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        return Response.json({
          connected: false,
          message: "Token expired and refresh failed. Please reconnect Gmail.",
          connectUrl: "/api/auth/connect",
          inbox: [],
          nextPageToken: null,
          stats: { total: 0, unread: 0, actionRequired: 0, clientEmails: 0 },
        });
      }
    }

    // Fetch inbox with pagination
    const result = await getGmailInbox(accessToken, maxResults, pageToken);
    const messages = result.emails || [];
    const nextPageToken = result.nextPageToken || null;
    const unread = messages.filter((m) => !m.isRead).length;

    let classifiedMessages = messages;
    let actionRequired = 0;
    let clientEmails = 0;

    // Only auto-classify on the first page (no pageToken)
    if (messages.length > 0 && !pageToken) {
      try {
        const origin = new URL(request.url).origin;
        const classifyRes = await fetch(`${origin}/api/email/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: messages }),
        });

        if (classifyRes.ok) {
          const { classifications } = await classifyRes.json();
          if (classifications && Array.isArray(classifications)) {
            classifiedMessages = messages.map((msg) => {
              const classification = classifications.find((c) => c.emailId === msg.id);
              if (classification) {
                if (classification.category === "action-required") actionRequired++;
                if (classification.category === "client") clientEmails++;
                return { ...msg, ...classification };
              }
              return msg;
            });


            // Auto-apply labels
            try {
              let currentLabels = [];
              try {
                const labelsRes = await listGmailLabels(accessToken);
                currentLabels = labelsRes.labels || [];
              } catch (e) {
                console.error("Failed to list labels:", e);
              }

              const categoryToLabel = {}; // Cache label mapping

              for (const msg of classifiedMessages) {
                if (msg.category && msg.category !== "unknown") {
                  // Map category e.g., "client" -> "Gravix/Client"
                  const categoryName = msg.category.charAt(0).toUpperCase() + msg.category.slice(1);
                  const labelName = `Gravix/${categoryName}`;

                  let labelId = categoryToLabel[labelName];

                  if (!labelId) {
                    const existingLabel = currentLabels.find(l => l.name === labelName);
                    if (existingLabel) {
                      labelId = existingLabel.id;
                    } else {
                      // Create label
                      const newLabel = await createGmailLabel(accessToken, labelName, "#4285f4", "#ffffff");
                      labelId = newLabel.id;
                      currentLabels.push(newLabel);
                    }
                    categoryToLabel[labelName] = labelId;
                  }

                  if (labelId) {
                    await applyGmailLabel(accessToken, msg.id, [labelId], []);
                    // Update the message in our result array
                    msg.labelIds = [...(msg.labelIds || []), labelId];
                  }
                }
              }
            } catch (lblErr) {
              console.error("Failed to auto-apply labels:", lblErr);
            }

            // Trigger pipeline only on first load
            await fetch(`${origin}/api/automation/email-pipeline`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emails: classifiedMessages }),
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
      nextPageToken,
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
        nextPageToken: null,
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

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        message: "Gmail API not connected. Go to Settings → Integrations → Connect Gmail.",
        connectUrl: "/api/auth/connect",
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;
      await adminDb.collection("settings").doc("google_oauth").update({
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    }

    if (action === "fetch") {
      const result = await getGmailInbox(accessToken, options.maxResults || 20, options.pageToken || null);
      const messages = result.emails || [];

      let classifiedMessages = messages;
      if (messages.length > 0) {
        try {
          const origin = new URL(request.url).origin;
          const classifyRes = await fetch(`${origin}/api/email/classify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: messages }),
          });

          if (classifyRes.ok) {
            const { classifications } = await classifyRes.json();
            if (classifications && Array.isArray(classifications)) {
              classifiedMessages = messages.map((msg) => {
                const classification = classifications.find((c) => c.emailId === msg.id);
                return classification ? { ...msg, ...classification } : msg;
              });

              await fetch(`${origin}/api/automation/email-pipeline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails: classifiedMessages }),
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
        nextPageToken: result.nextPageToken || null,
      });
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
