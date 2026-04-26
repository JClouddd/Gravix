import { googleApiRequest, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    return Response.json({ message: "Clients meet GET endpoint" }, { status: 200 });
  } catch (error) {
    console.error("Error fetching clients meet:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, start, end, description, attendees, calendarId = "primary" } = body;

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

    const event = {
      summary: title,
      start: start.includes("T") ? { dateTime: start } : { date: start },
      end: end.includes("T") ? { dateTime: end } : { date: end },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      }
    };

    if (description) event.description = description;
    if (attendees && Array.isArray(attendees)) {
      event.attendees = attendees.map(email => ({ email }));
    }

    const created = await googleApiRequest(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        body: JSON.stringify(event),
      }
    );

    return Response.json({
      success: true,
      event: {
        id: created.id,
        summary: created.summary,
        start: created.start?.dateTime || created.start?.date,
        end: created.end?.dateTime || created.end?.date,
        htmlLink: created.htmlLink,
        meetLink: created.hangoutLink,
      },
    });
  } catch (error) {
    console.error("[/api/clients/meet]", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
