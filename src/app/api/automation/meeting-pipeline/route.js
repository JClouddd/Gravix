
import { adminDb } from "@/lib/firebaseAdmin";
import { refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";
import { generate } from "@/lib/geminiClient";

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetingId = "unknown", transcript, analysis } = body;

    if (!analysis) {
      return Response.json({ error: "Analysis data required" }, { status: 400 });
    }

    const { actionItems = [], followUps = [], decisions = [] } = analysis;

    // Get and manage OAuth tokens
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return Response.json({ error: "Google Workspace not connected" }, { status: 401 });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;
        await adminDb.collection("settings").doc("google_oauth").update( {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        return Response.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
      }
    }

    let tasksCreated = 0;
    let eventsCreated = 0;
    let decisionsStored = 0;

    // Create Tasks
    for (const item of actionItems) {
      try {
        const taskPayload = {
          title: item.task || "Meeting Action Item",
          notes: `From meeting: ${meetingId}\nOwner: ${item.owner || "Unassigned"}`,
        };

        if (item.deadline) {
          // Attempt to parse/set deadline
          const date = new Date(item.deadline);
          if (!isNaN(date.getTime())) {
             taskPayload.due = date.toISOString();
          }
        }

        await googleApiRequest(
          accessToken,
          "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
          {
            method: "POST",
            body: JSON.stringify(taskPayload),
          }
        );
        tasksCreated++;
      } catch (err) {
        console.error("Failed to create task", err);
      }
    }

    // Create Calendar Events for follow-ups
    for (const item of followUps) {
      try {
        const eventStart = new Date();
        eventStart.setDate(eventStart.getDate() + 7); // 1 week from now

        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + 30); // 30 min duration

        const eventPayload = {
          summary: `Follow-up: ${item.item || item.task || "Meeting item"}`,
          description: `Generated from meeting: ${meetingId}`,
          start: {
            dateTime: eventStart.toISOString(),
            timeZone: "UTC"
          },
          end: {
             dateTime: eventEnd.toISOString(),
             timeZone: "UTC"
          }
        };

        await googleApiRequest(
          accessToken,
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            body: JSON.stringify(eventPayload),
          }
        );
        eventsCreated++;
      } catch (err) {
        console.error("Failed to create follow-up event", err);
      }
    }

    // Store Decisions in Firestore
    for (const decision of decisions) {
      try {
        const decisionText = typeof decision === "string" ? decision : decision.decision;
        if (decisionText) {
          await adminDb.collection("meeting_decisions").add( {
            meetingId,
            decision: decisionText,
            timestamp: new Date().toISOString(),
          });
          decisionsStored++;
        }
      } catch (err) {
        console.error("Failed to store decision", err);
      }
    }

    // Draft Email Summary using Gemini
    let emailDrafted = false;
    try {
      const prompt = `
        Summarize the following meeting for the attendees.
        Include a brief overview, list the key decisions, and clearly list the action items with their owners.

        Meeting Transcript/Notes:
        ${transcript ? transcript : JSON.stringify(analysis)}
      `;

      const generatedEmail = await generate({
         prompt,
         systemPrompt: "You are an assistant creating a professional meeting summary email draft. Output plain text suitable for the body of an email.",
         complexity: "flash"
      });

      await adminDb.collection("email_drafts").add( {
        meetingId,
        subject: `Meeting Summary: ${meetingId}`,
        body: generatedEmail,
        createdAt: new Date().toISOString(),
      });
      emailDrafted = true;
    } catch (err) {
      console.error("Failed to draft email", err);
    }

    return Response.json({
      success: true,
      tasksCreated,
      eventsCreated,
      decisionsStored,
      emailDrafted
    });

  } catch (error) {
    console.error("[/api/automation/meeting-pipeline] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
