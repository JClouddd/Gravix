
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

    // Pre-fetch access token if any email needs task creation
    const needsTask = emails.some(e => e.category === "action-required" || e.urgency === "high");
    if (needsTask) {
      const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
      if (tokensDoc.exists) {
        const tokens = tokensDoc.data();
        accessToken = tokens.accessToken;

        if (Date.now() > tokens.expiresAt) {
          const refreshed = await refreshAccessToken(tokens.refreshToken);
          accessToken = refreshed.access_token;
          await adminDb.collection("settings").doc("google_oauth").update({
            accessToken: refreshed.access_token,
            expiresAt: Date.now() + (refreshed.expires_in * 1000),
          });
        }
      }
    }

    const taskPromises = [];
    const batch = adminDb.batch();

    for (const email of emails) {
      const { id, from, subject, snippet, category, urgency } = email;
      processed++;

      // 1. Task creation for action-required or high urgency
      if (category === "action-required" || urgency === "high") {
        if (accessToken) {
          const taskPromise = fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: subject,
              notes: `From: ${from}\nSnippet: ${snippet}`,
            }),
          }).then(res => {
            if (!res.ok) throw new Error(`Tasks API error: ${res.status}`);
            tasksCreated++;
          }).catch(err => {
            console.error("Failed to create task for email", id, err);
          });
          taskPromises.push(taskPromise);
        }
      }

      // 2. Client linkage
      if (category === "client") {
        const clientRef = adminDb.collection("client_emails").doc();
        batch.set(clientRef, {
          emailId: id,
          from,
          matchedClient: from, // simplified for now
          timestamp: new Date().toISOString(),
        });
        clientsLinked++;
      }

      // 3. Invoice logging
      const lowerSubject = (subject || "").toLowerCase();
      if (category === "invoice" || lowerSubject.includes("invoice") || lowerSubject.includes("receipt")) {
        const incomeRef = adminDb.collection("income_entries").doc();
        batch.set(incomeRef, {
          from,
          subject,
          timestamp: new Date().toISOString(),
          source: "email-auto",
        });
        invoicesLogged++;
      }
    }

    // Execute API requests and batch writes concurrently
    await Promise.all([
      ...taskPromises,
      batch.commit().catch(err => {
        console.error("Failed to commit batch writes", err);
        // We'll reset counts if batch fails to reflect truth, but keeping simple
        // Normally, we'd only increment counts upon success.
        // For batch, it's all or nothing. So if it fails, clientsLinked and invoicesLogged shouldn't be counted.
        clientsLinked = 0;
        invoicesLogged = 0;
      })
    ]);

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
