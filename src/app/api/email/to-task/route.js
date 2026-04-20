import { refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";

import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { emailId, taskTitle, taskNotes, due } = await request.json();

    if (!emailId || !taskTitle) {
      return Response.json({ error: "emailId and taskTitle are required" }, { status: 400 });
    }

    // 1. Get OAuth tokens
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return Response.json({ error: "Google Workspace is not connected." }, { status: 401 });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    // Refresh if expired
    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;
        await adminDb.collection("settings").doc("google_oauth").update( {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        logRouteError("gmail", "/api/email/to-task error", err, "/api/email/to-task");
      return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    // 2. Fetch email context to enrich task notes
    const emailMsg = await googleApiRequest(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`
    );

    let fromStr = "Unknown";
    let subjectStr = "No Subject";

    if (emailMsg && emailMsg.payload && emailMsg.payload.headers) {
      fromStr = emailMsg.payload.headers.find(h => h.name === 'From')?.value || "Unknown";
      subjectStr = emailMsg.payload.headers.find(h => h.name === 'Subject')?.value || "No Subject";
    }

    const finalNotes = (taskNotes || "") + `\n\nSource: Email from ${fromStr} - ${subjectStr}`;

    // 3. Create Google Task
    const taskPayload = {
      title: taskTitle,
      notes: finalNotes,
      ...(due && { due: new Date(due).toISOString() })
    };

    const taskResult = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(taskPayload)
    });

    if (!taskResult.ok) {
        const errorData = await taskResult.text();
        throw new Error(`Failed to create task: ${taskResult.status} ${errorData}`);
    }

    const createdTask = await taskResult.json();

    // 4. Optionally mark the email with a label/star (e.g. STARRED)
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            addLabelIds: ["STARRED"]
        })
    });

    return Response.json({ created: true, taskId: createdTask.id });

  } catch (error) {
    console.error("[/api/email/to-task]", error);
    logRouteError("gmail", "/api/email/to-task error", error, "/api/email/to-task");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
