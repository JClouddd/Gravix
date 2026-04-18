
import { adminDb } from "@/lib/firebaseAdmin";
import { refreshAccessToken } from "@/lib/googleAuth";

export async function POST(request) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails)) {
      return Response.json({ error: "Missing or invalid 'emails' array." }, { status: 400 });
    }

    let processed = 0;
    let tasksCreated = 0;
    let clientsLinked = 0;
    let invoicesLogged = 0;

    let accessToken = null;
    const batch = adminDb.batch();

    for (const email of emails) {
      const { id, from, subject, snippet, category, urgency } = email;
      processed++;

      // 1. Task creation for action-required or high urgency
      if (category === "action-required" || urgency === "high") {
        if (!accessToken) {
          const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
          if (tokensDoc.exists) {
            const tokens = tokensDoc.data();
            accessToken = tokens.accessToken;

            if (Date.now() > tokens.expiresAt) {
              const refreshed = await refreshAccessToken(tokens.refreshToken);
              accessToken = refreshed.access_token;
              await adminDb.collection("settings").doc("google_oauth").update( {
                accessToken: refreshed.access_token,
                expiresAt: Date.now() + (refreshed.expires_in * 1000),
              });
            }
          }
        }

        if (accessToken) {
          try {
            await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: subject,
                notes: `From: ${from}\nSnippet: ${snippet}`,
              }),
            });
            tasksCreated++;
          } catch (err) {
            console.error("Failed to create task for email", id, err);
          }
        }
      }

      // 2. Client linkage
      if (category === "client") {
        try {
          const docRef = adminDb.collection("client_emails").doc();
          batch.set(docRef, {
            emailId: id,
            from,
            matchedClient: from, // simplified for now
            timestamp: new Date().toISOString(),
          });
          clientsLinked++;
        } catch (err) {
          console.error("Failed to link client email", id, err);
        }
      }

      // 3. Invoice logging
      const lowerSubject = (subject || "").toLowerCase();
      if (category === "invoice" || lowerSubject.includes("invoice") || lowerSubject.includes("receipt")) {
        try {
          const docRef = adminDb.collection("income_entries").doc();
          batch.set(docRef, {
            from,
            subject,
            timestamp: new Date().toISOString(),
            source: "email-auto",
          });
          invoicesLogged++;
        } catch (err) {
          console.error("Failed to log invoice for email", id, err);
        }
      }
    }

    if (clientsLinked > 0 || invoicesLogged > 0) {
      try {
        await batch.commit();
      } catch (err) {
        console.error("Failed to commit batch", err);
      }
    }

    return Response.json({
      processed,
      tasksCreated,
      clientsLinked,
      invoicesLogged,
    });
  } catch (error) {
    console.error("[/api/automation/email-pipeline]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
