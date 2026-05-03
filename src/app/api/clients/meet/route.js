import { NextResponse } from 'next/server';
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";
import { createCalendarEvent, listMeetConferences, refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";

export async function GET(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return NextResponse.json({ error: "Not connected to Google Workspace" }, { status: 401 });
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
      } catch (e) {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    const meetConferences = await listMeetConferences(accessToken);

    return NextResponse.json(meetConferences, { status: 200 });
  } catch (error) {
    console.error("Error fetching clients meet:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { calendarId = "primary", title, start, end, description, attendees } = body;

    if (!title || !start || !end) {
      return NextResponse.json({ error: "title, start, and end are required" }, { status: 400 });
    }

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return NextResponse.json({ error: "Not connected to Google Workspace" }, { status: 401 });
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
      } catch (e) {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    // Build the Google Calendar event object with Meet link requested
    const event = {
      summary: title,
      start: start.includes("T") ? { dateTime: start } : { date: start },
      end: end.includes("T") ? { dateTime: end } : { date: end },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
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

    // As per the memory: Google Meet link generation via the Google Calendar API requires appending the ?conferenceDataVersion=1 query parameter to the events endpoint URL.
    // Instead of directly using createCalendarEvent from googleAuth which lacks this, we will perform the fetch call using googleApiRequest.
    const created = await googleApiRequest(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        body: JSON.stringify(event),
      }
    );

    // Store the scheduled meeting data in Firestore
    await adminDb.collection("clients_meet").add({
      calendarId,
      eventId: created.id,
      summary: created.summary,
      start: created.start,
      end: created.end,
      meetLink: created.hangoutLink,
      attendees: created.attendees,
      createdAt: Date.now()
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating clients meet:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
