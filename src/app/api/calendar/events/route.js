import { listCalendars, getCalendarEventsMulti, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/calendar/events — Fetches events from ALL user calendars
 * Returns events tagged with calendarId and calendar color for multi-calendar display
 */
export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        events: [],
        calendars: [],
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
        logRouteError("calendar", "/api/calendar/events error", err, "/api/calendar/events");
      return Response.json({
          connected: false,
          connectUrl: "/api/auth/connect",
          events: [],
          calendars: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    // Fetch all calendars
    const calData = await listCalendars(accessToken);
    const allCalendars = (calData.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary || cal.summaryOverride || "Unnamed",
      backgroundColor: cal.backgroundColor || "#4285f4",
      primary: cal.primary || false,
      selected: cal.selected !== false,
    }));

    // Get IDs of selected calendars
    const selectedIds = allCalendars
      .filter(c => c.selected)
      .map(c => c.id);

    // Build calendar color lookup
    const calColorMap = {};
    allCalendars.forEach(c => { calColorMap[c.id] = c.backgroundColor; });
    const calNameMap = {};
    allCalendars.forEach(c => { calNameMap[c.id] = c.summary; });

    // Fetch events from all selected calendars
    const rawEvents = selectedIds.length > 0
      ? await getCalendarEventsMulti(accessToken, selectedIds, 50)
      : [];

    // Fetch clients for tagging
    const clientsSnapshot = await adminDb.collection("clients").get();
    const clientEmails = new Set();
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) clientEmails.add(data.email.toLowerCase());
    });

    // Map events
    const mappedEvents = rawEvents.map((evt) => {
      const start = evt.start?.dateTime || evt.start?.date || "";
      const end = evt.end?.dateTime || evt.end?.date || "";
      const summary = evt.summary || "Untitled Event";
      const attendees = evt.attendees || [];

      let sourceType = "personal";
      const calId = evt.calendarId || "primary";
      let color = calColorMap[calId] || "#22c55e";

      // Tag client events
      const hasClient = attendees.some(a => a.email && clientEmails.has(a.email.toLowerCase()));
      if (hasClient) {
        sourceType = "client";
      }

      // Tag agent events
      if (summary.startsWith("Follow-up") || summary.startsWith("Kickoff")) {
        sourceType = "agent";
      }

      return {
        id: evt.id,
        summary,
        start,
        end,
        location: evt.location || "",
        meetLink: evt.hangoutLink || "",
        attendees,
        sourceType,
        color,
        calendarId: calId,
        calendarName: calNameMap[calId] || calId,
      };
    });

    return Response.json({
      connected: true,
      events: mappedEvents,
      calendars: allCalendars,
    });
  } catch (error) {
    console.error("[/api/calendar/events]", error);
    logRouteError("calendar", "/api/calendar/events error", error, "/api/calendar/events");

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        events: [],
        calendars: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}
