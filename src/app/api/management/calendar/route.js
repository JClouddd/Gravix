import { NextResponse } from 'next/server';
import { listCalendars, getCalendarEventsMulti, refreshAccessToken, createCalendarEvent } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ success: false, connected: false, events: [], calendars: [] });
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

    // 1. Fetch all calendars
    const calData = await listCalendars(accessToken);
    const allCalendars = (calData.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary || cal.summaryOverride || "Unnamed",
      backgroundColor: cal.backgroundColor || "#4285f4",
      primary: cal.primary || false,
    }));

    // 2. Fetch events from all calendars
    const calendarIds = allCalendars.map(c => c.id);
    const rawEvents = calendarIds.length > 0
      ? await getCalendarEventsMulti(accessToken, calendarIds, 50)
      : [];

    // 3. Fetch Google Tasks to display on the calendar
    let tasksAsEvents = [];
    try {
      const { getTaskLists, getTasks } = require("@/lib/googleAuth");
      const lists = await getTaskLists(accessToken);
      const defaultList = lists.items?.[0]?.id || "@default";
      const tasksRaw = await getTasks(accessToken, defaultList);
      
      tasksAsEvents = (tasksRaw.items || [])
        .filter(t => t.due) // Only show tasks with due dates on the calendar
        .map(t => ({
          id: `task_${t.id}`,
          summary: `[Task] ${t.title}`,
          start: t.due, // Tasks only have a due date, no specific time block usually, but date-fns handles it
          end: t.due,
          calendarId: 'tasks',
          color: '#fbbc04', // Google Tasks yellow
          isTask: true,
          originalTaskId: t.id
        }));
    } catch (taskErr) {
      console.warn("Failed to fetch tasks for calendar merge:", taskErr.message);
    }

    // 4. Fetch Firestore metadata for these events (Dual-Engine)
    const firestoreMeta = await adminDb.collection("calendar_metadata").get();
    const metadataMap = {};
    firestoreMeta.forEach(doc => { metadataMap[doc.id] = doc.data(); });

    // Build color map for frontend grouping
    const calColorMap = {};
    allCalendars.forEach(c => { calColorMap[c.id] = c.backgroundColor; });

    const mappedEvents = rawEvents.map(evt => ({
      id: evt.id,
      summary: evt.summary || "Untitled",
      start: evt.start?.dateTime || evt.start?.date || "",
      end: evt.end?.dateTime || evt.end?.date || "",
      calendarId: evt.calendarId,
      color: calColorMap[evt.calendarId] || "#4285f4",
      antigravity_metadata: metadataMap[evt.id] || null
    }));

    // Merge Google Events and Tasks
    const finalEvents = [...mappedEvents, ...tasksAsEvents];

    // Inject a fake calendar for Tasks so the frontend can toggle it
    const enhancedCalendars = [
      ...allCalendars,
      { id: 'tasks', summary: 'Google Tasks', backgroundColor: '#fbbc04', primary: false }
    ];

    return NextResponse.json({ success: true, connected: true, events: finalEvents, calendars: enhancedCalendars });
  } catch (error) {
    logRouteError("management", "/api/management/calendar GET error", error, "/api/management/calendar");
    return NextResponse.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { summary, description, start, end, calendarId = "primary", guests = [], generateMeetLink = false } = data;
    
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) throw new Error("OAuth not configured");
    let { accessToken } = tokensDoc.data();

    const eventPayload = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end }
    };

    if (guests && guests.length > 0) {
      eventPayload.attendees = guests.map(email => ({ email: email.trim() }));
    }

    if (generateMeetLink) {
      eventPayload.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      };
    }

    const newEvent = await createCalendarEvent(accessToken, calendarId, eventPayload);

    // -------------------------------------------------------------
    // SWARM INTERCEPTION HOOK & METADATA LAYER
    // -------------------------------------------------------------
    const metadataRef = adminDb.collection("calendar_metadata").doc(newEvent.id);
    let aiEnhanced = false;
    let assignedAgent = null;

    // Trigger Rule 1: If it has external guests, assign 'Sentinel' for Pre-Meeting Prep
    if (guests && guests.length > 0) {
      aiEnhanced = true;
      assignedAgent = "Sentinel"; // Scrapes LinkedIn/CRM 15 mins before meeting
    }
    
    // Trigger Rule 2: Auto-Agenda Generation for "Brainstorming" or "Strategy"
    if (summary.toLowerCase().includes("brainstorming") || summary.toLowerCase().includes("strategy")) {
      aiEnhanced = true;
      assignedAgent = "Planner"; // Will auto-inject an agenda into the description later
    }

    // Save the metadata link
    await metadataRef.set({
      eventId: newEvent.id,
      calendarId: calendarId,
      source: data.source || "tasks", // linked from tasks or projects
      aiEnhanced: aiEnhanced,
      assignedAgent: assignedAgent,
      linkedGuests: guests,
      createdAt: adminDb.FieldValue.serverTimestamp()
    });

    // If aiEnhanced, we can trigger the Cloud Task / Swarm Endpoint here asynchronously
    if (aiEnhanced) {
      console.log(`[Swarm Intercept] Event ${newEvent.id} flagged for Agent: ${assignedAgent}`);
      // In production, we would queue a Google Cloud Task here:
      // queueCloudTask('/api/swarm/trigger', { eventId: newEvent.id, agent: assignedAgent })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Event created successfully', 
      event: { ...newEvent, antigravity_metadata: { aiEnhanced, assignedAgent, source: data.source } } 
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    logRouteError("management", "/api/management/calendar POST error", error, "/api/management/calendar");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
