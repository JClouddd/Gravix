import { getCalendarEvents, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        events: [],
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
        return Response.json({
          connected: false,
          connectUrl: "/api/auth/connect",
          events: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const eventsResponse = await getCalendarEvents(accessToken);
    const rawEvents = eventsResponse.items || eventsResponse || [];

    // Safely map and extract fields
    const mappedEvents = (Array.isArray(rawEvents) ? rawEvents : []).map((evt) => {
      const start = evt.start?.dateTime || evt.start?.date || "";
      const end = evt.end?.dateTime || evt.end?.date || "";
      return {
        id: evt.id,
        summary: evt.summary || "Untitled Event",
        start,
        end,
        location: evt.location || "",
        meetLink: evt.hangoutLink || "",
        attendees: evt.attendees || [],
      };
    });

    return Response.json({
      connected: true,
      events: mappedEvents,
    });
  } catch (error) {
    console.error("[/api/calendar/events]", error);

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        events: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}
