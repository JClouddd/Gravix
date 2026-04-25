import { NextResponse } from "next/server";
import { getValidTokens, googleApiRequest } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    // 1. Get Authentication
    const tokens = await getValidTokens();
    if (!tokens) {
      return NextResponse.json({ success: false, connected: false, error: "Not authenticated with Google" }, { status: 401 });
    }

    // 2. Parse Request
    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ success: false, error: "No tasks selected" }, { status: 400 });
    }

    // 3. Find primary calendar ID
    const calendarsRes = await googleApiRequest('https://www.googleapis.com/calendar/v3/users/me/calendarList', tokens.access_token);
    const primaryCalendar = calendarsRes.items?.find(c => c.primary)?.id || 'primary';

    // 4. Heuristic Auto-Scheduling (Motion pattern MVP)
    // We will schedule them sequentially starting Tomorrow at 9:00 AM.
    const scheduledCount = 0;
    const now = new Date();
    
    // Start scheduling from tomorrow 9 AM
    let currentSlotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);

    for (const taskId of taskIds) {
      // Find the task in Firestore metadata
      const taskDoc = await adminDb.collection("management_tasks").doc(taskId).get();
      const taskMeta = taskDoc.exists ? taskDoc.data() : {};
      
      // We assume duration is 1 hour default
      const durationHours = taskMeta.durationHours || 1;
      
      const slotEnd = new Date(currentSlotStart.getTime() + durationHours * 60 * 60 * 1000);

      const eventPayload = {
        summary: `[Auto-Scheduled Task]`,
        description: `Task ID: ${taskId}`,
        start: { dateTime: currentSlotStart.toISOString() },
        end: { dateTime: slotEnd.toISOString() },
        colorId: '9' // Blueberry color
      };

      // In a real robust system we'd check Free/Busy here.
      // For now, we force schedule.
      await googleApiRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(primaryCalendar)}/events`,
        tokens.access_token,
        'POST',
        eventPayload
      );

      // Increment slot for next task
      currentSlotStart = slotEnd;
      // if past 5 PM, move to next day 9 AM
      if (currentSlotStart.getHours() >= 17) {
        currentSlotStart = new Date(currentSlotStart.getFullYear(), currentSlotStart.getMonth(), currentSlotStart.getDate() + 1, 9, 0, 0);
      }
    }

    return NextResponse.json({ 
      success: true, 
      scheduledCount: taskIds.length 
    });
  } catch (error) {
    console.error("Auto-Schedule error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
