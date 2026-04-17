import { getTaskLists, getTasks, refreshAccessToken } from "@/lib/googleAuth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const tokensDoc = await getDoc(doc(db, "settings", "google_oauth"));

    if (!tokensDoc.exists()) {
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

        await updateDoc(doc(db, "settings", "google_oauth"), {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
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
