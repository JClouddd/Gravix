import { NextResponse } from 'next/server';
import { getTaskLists, getTasks, refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ success: false, connected: false, tasks: [] });
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
        return NextResponse.json({ success: false, connected: false, message: "Token expired" });
      }
    }

    const { searchParams } = new URL(request.url);
    const requestedListId = searchParams.get('taskListId');

    // 1. Fetch Google Tasks Lists to find the default list
    const lists = await getTaskLists(accessToken);
    const defaultList = lists.items?.[0]?.id || "@default";
    const activeListId = requestedListId || defaultList;
    
    // 2. Fetch Google Tasks
    const tasksRaw = await getTasks(accessToken, activeListId);
    
    // 3. Fetch Firestore Metadata (custom tags, projects)
    const firestoreTasks = await adminDb.collection("management_tasks").get();
    const metadataMap = {};
    firestoreTasks.forEach(doc => { metadataMap[doc.id] = doc.data(); });

    // 4. Merge
    const mergedTasks = (tasksRaw.items || []).map(t => ({
      ...t,
      antigravity_metadata: metadataMap[t.id] || { tags: [], projectId: null }
    }));

    return NextResponse.json({ 
      success: true, 
      connected: true, 
      tasks: mergedTasks, 
      taskListId: activeListId,
      taskLists: lists.items || [] 
    });
  } catch (error) {
    logRouteError("management", "/api/management/tasks GET error", error, "/api/management/tasks");
    return NextResponse.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { title, notes, due, tags = [], projectId = null, taskListId = "@default" } = data;
    
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) throw new Error("OAuth not configured");
    let { accessToken } = tokensDoc.data();

    // 1. Create in Google Tasks
    const newTask = await googleApiRequest(
      accessToken,
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify({ title, notes, due }),
      }
    );

    // 2. Save metadata to Firestore using the Google Task ID as the document ID
    await adminDb.collection("management_tasks").doc(newTask.id).set({
      tags,
      projectId,
      createdAt: adminDb.FieldValue.serverTimestamp(),
      updatedAt: adminDb.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Task created successfully', task: { ...newTask, antigravity_metadata: { tags, projectId } } });
  } catch (error) {
    console.error('Error creating task:', error);
    logRouteError("management", "/api/management/tasks POST error", error, "/api/management/tasks");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { id, taskListId = "@default", updates, action, previousId } = data;
    
    if (!id) throw new Error("Task ID is required");

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) throw new Error("OAuth not configured");
    let { accessToken } = tokensDoc.data();

    // Handle 'move' action separately if requested via PATCH
    if (action === 'move') {
      const movedTask = await googleApiRequest(
        accessToken,
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${id}/move${previousId ? `?previous=${previousId}` : ''}`,
        { method: "POST" }
      );
      return NextResponse.json({ success: true, task: movedTask });
    }

    // Otherwise, it's a normal patch
    if (!updates) throw new Error("Updates payload required");

    // Separate Google Tasks fields vs Firestore Metadata fields
    const googleFields = ['title', 'notes', 'due', 'status', 'completed'];
    const googleUpdates = {};
    const metaUpdates = {};
    let hasGoogleUpdates = false;
    let hasMetaUpdates = false;

    for (const [key, value] of Object.entries(updates)) {
      if (googleFields.includes(key)) {
        googleUpdates[key] = value;
        hasGoogleUpdates = true;
      } else {
        metaUpdates[key] = value;
        hasMetaUpdates = true;
      }
    }

    let updatedGoogleTask = { id };
    if (hasGoogleUpdates) {
      updatedGoogleTask = await googleApiRequest(
        accessToken,
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${id}`,
        { method: "PATCH", body: JSON.stringify(googleUpdates) }
      );
    }

    if (hasMetaUpdates) {
      await adminDb.collection("management_tasks").doc(id).set({
        ...metaUpdates,
        updatedAt: adminDb.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return NextResponse.json({ success: true, task: updatedGoogleTask });

  } catch (error) {
    console.error('Error updating task:', error);
    logRouteError("management", "/api/management/tasks PATCH error", error, "/api/management/tasks");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
