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

    // Build color map for frontend grouping
    const calColorMap = {};
    allCalendars.forEach(c => { calColorMap[c.id] = c.backgroundColor; });

    const mappedEvents = rawEvents.map(evt => ({
      id: evt.id,
      summary: evt.summary || "Untitled",
      start: evt.start?.dateTime || evt.start?.date || "",
      end: evt.end?.dateTime || evt.end?.date || "",
      calendarId: evt.calendarId,
      color: calColorMap[evt.calendarId] || "#4285f4"
    }));

    return NextResponse.json({ success: true, connected: true, events: mappedEvents, calendars: allCalendars });
  } catch (error) {
    logRouteError("management", "/api/management/calendar GET error", error, "/api/management/calendar");
    return NextResponse.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { summary, description, start, end, calendarId = "primary" } = data;
    
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) throw new Error("OAuth not configured");
    let { accessToken } = tokensDoc.data();

    const eventPayload = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end }
    };

    const newEvent = await createCalendarEvent(accessToken, calendarId, eventPayload);

    return NextResponse.json({ success: true, message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    logRouteError("management", "/api/management/calendar POST error", error, "/api/management/calendar");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
