import { createCalendarEvent, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/calendar/create — Creates a new calendar event
 * Body: { calendarId?, title, start, end, description?, location?, attendees? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { calendarId = "primary", title, start, end, description, location, attendees } = body;

    if (!title || !start || !end) {
      return Response.json({ error: "title, start, and end are required" }, { status: 400 });
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

    // Build the Google Calendar event object
    const event = {
      summary: title,
      start: start.includes("T") ? { dateTime: start } : { date: start },
      end: end.includes("T") ? { dateTime: end } : { date: end },
    };

    if (description) event.description = description;
    if (location) event.location = location;
    if (attendees && Array.isArray(attendees)) {
      event.attendees = attendees.map(email => ({ email }));
    }

    const created = await createCalendarEvent(accessToken, calendarId, event);

    return Response.json({
      success: true,
      event: {
        id: created.id,
        summary: created.summary,
        start: created.start?.dateTime || created.start?.date,
        end: created.end?.dateTime || created.end?.date,
        htmlLink: created.htmlLink,
      },
    });
  } catch (error) {
    console.error("[/api/calendar/create]", error);
    logRouteError("calendar", "/api/calendar/create error", error, "/api/calendar/create");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
