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

    // Fetch clients to check for attendee matches
    const clientsSnapshot = await getDocs(collection(db, "clients"));
    const clientEmails = new Set();
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        clientEmails.add(data.email.toLowerCase());
      }
    });

    // Safely map and extract fields
    const mappedEvents = (Array.isArray(rawEvents) ? rawEvents : []).map((evt) => {
      const start = evt.start?.dateTime || evt.start?.date || "";
      const end = evt.end?.dateTime || evt.end?.date || "";
      const summary = evt.summary || "Untitled Event";
      const attendees = evt.attendees || [];

      let sourceType = "personal";
      let color = "#22c55e"; // Default: green

      if (summary.startsWith("Follow-up") || summary.startsWith("Kickoff")) {
        sourceType = "agent";
        color = "#8b5cf6"; // Purple
      } else {
        const hasClient = attendees.some(a => a.email && clientEmails.has(a.email.toLowerCase()));
        if (hasClient) {
          sourceType = "client";
          color = "#3b82f6"; // Blue
        }
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
