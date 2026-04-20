import { getTaskLists, getTasks, refreshAccessToken, updateTask } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        lists: [],
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
        logRouteError("tasks", "/api/tasks/list error", err, "/api/tasks/list");
      return Response.json({
          connected: false,
          connectUrl: "/api/auth/connect",
          lists: [],
          tasks: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const listsResponse = await getTaskLists(accessToken);
    const taskLists = listsResponse.items || [];

    // Fetch tasks for all lists
    const tasksPromises = taskLists.map(async (list) => {
      try {
        const tasksRes = await getTasks(accessToken, list.id);
        const tasks = tasksRes.items || [];
        return tasks.map(task => {
          let source = "manual";
          let sourceIcon = "✋";

          if (task.notes) {
            if (task.notes.includes("Source: Email")) {
              source = "email";
              sourceIcon = "✉️";
            } else if (task.notes.includes("From meeting")) {
              source = "meeting";
              sourceIcon = "🎙️";
            } else if (task.notes.includes("Agent:")) {
              source = "agent";
              sourceIcon = "🤖";
            }
          }

          return {
            ...task,
            listId: list.id,
            listTitle: list.title,
            source,
            sourceIcon
          };
        });
      } catch (e) {
        console.error(`Failed to fetch tasks for list ${list.id}`, e);
        logRouteError("tasks", "/api/tasks/list error", e, "/api/tasks/list");
        return [];
      }
    });

    const tasksArrays = await Promise.all(tasksPromises);
    const allTasks = tasksArrays.flat();

    return Response.json({
      connected: true,
      lists: taskLists,
      tasks: allTasks,
    });
  } catch (error) {
    console.error("[/api/tasks/list]", error);
    logRouteError("tasks", "/api/tasks/list error", error, "/api/tasks/list");

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        lists: [],
        tasks: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ connected: false, message: "Not connected" }, { status: 401 });
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
        logRouteError("tasks", "/api/tasks/list error", err, "/api/tasks/list");
      return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    const listsResponse = await getTaskLists(accessToken);
    const taskLists = listsResponse.items || [];

    let closedCount = 0;

    for (const list of taskLists) {
      try {
        const tasksRes = await getTasks(accessToken, list.id);
        const tasks = tasksRes.items || [];

        for (const task of tasks) {
           if (task.notes && task.notes.includes("Agent: completed") && task.status !== 'completed') {
               await updateTask(accessToken, list.id, task.id, { id: task.id, title: task.title, status: 'completed' });
               closedCount++;
           }
        }
      } catch (e) {
        console.error(`Failed to process tasks for list ${list.id}`, e);
        logRouteError("tasks", "/api/tasks/list error", e, "/api/tasks/list");
      }
    }

    return Response.json({ success: true, closedTasksCount: closedCount });
  } catch (error) {
    console.error("[/api/tasks/list POST]", error);
    logRouteError("tasks", "/api/tasks/list error", error, "/api/tasks/list");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
