import { updateTask, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/tasks/update — Updates a Google Task
 * Body: { listId, taskId, title?, status?, due?, notes? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { listId = "@default", taskId, title, status, due, notes } = body;

    if (!taskId) {
      return Response.json({ error: "taskId is required" }, { status: 400 });
    }

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return Response.json({ error: "Not connected to Google Workspace" }, { status: 401 });
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
      } catch {
        return Response.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    // Build the update payload
    const updateData = { id: taskId };
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (due !== undefined) updateData.due = due;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await updateTask(accessToken, listId, taskId, updateData);

    return Response.json({
      success: true,
      task: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        due: updated.due,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error("[/api/tasks/update]", error);
    logRouteError("tasks", "/api/tasks/update error", error, "/api/tasks/update");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
