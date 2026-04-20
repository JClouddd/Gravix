import { googleApiRequest, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/meet/actions
 * Create Google Tasks from action items
 */
export async function POST(request) {
  try {
    const { actions } = await request.json();

    if (!actions || !Array.isArray(actions)) {
      return Response.json({ error: "actions array is required" }, { status: 400 });
    }

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        message: "Google Tasks API not connected.",
        created: 0,
        tasks: [],
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
        logRouteError("meet", "/api/meet/actions error", err, "/api/meet/actions");
        return Response.json({
          connected: false,
          message: "Token expired and refresh failed.",
          created: 0,
          tasks: [],
        });
      }
    }

    // Create tasks concurrently
    const createdTasks = await Promise.all(
      actions.map(async (action) => {
        try {
          const taskData = {
            title: action.task || "Untitled Task",
            notes: `Assignee: ${action.assignee || "Unknown"}\nCreated from Meet Transcript.`,
          };

          if (action.deadline && action.deadline !== "Unknown") {
            // Attempt to parse deadline if format allows, though it may just be text
            // Google Tasks expects RFC 3339 timestamp for due dates (e.g. 2023-10-25T00:00:00.000Z)
             try {
                const parsedDate = new Date(action.deadline);
                if (!isNaN(parsedDate.valueOf())) {
                    taskData.due = parsedDate.toISOString();
                }
             } catch(e) {
                 // Ignore date parsing errors and leave due date empty
                 console.warn("Could not parse date:", action.deadline);
                 logRouteError("meet", "/api/meet/actions date parse error", e, "/api/meet/actions");
             }
          }

          const response = await googleApiRequest(
            accessToken,
            "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
            {
              method: "POST",
              body: JSON.stringify(taskData),
            }
          );

          return response;
        } catch (e) {
          console.error("Failed to create task", action, e);
          logRouteError("meet", "/api/meet/actions create task error", e, "/api/meet/actions");
          return null;
        }
      })
    );

    const successfulTasks = createdTasks.filter(t => t !== null);

    return Response.json({
      created: successfulTasks.length,
      tasks: successfulTasks,
    });
  } catch (error) {
    console.error("[/api/meet/actions]", error);
    logRouteError("meet", "/api/meet/actions error", error, "/api/meet/actions");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
