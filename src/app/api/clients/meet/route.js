import { NextResponse } from 'next/server';
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";
import { createCalendarEvent, refreshAccessToken } from "@/lib/googleAuth";
import language from '@google-cloud/language';

const languageClient = new language.LanguageServiceClient();

export async function GET(request) {
  try {
    return NextResponse.json({ status: "ready", message: "Clients meet GET endpoint" }, { status: 200 });
  } catch (error) {
    console.error("Error fetching clients meet:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, start, end, attendees, transcript } = body;

    let sentiment = null;
    let routing = 'neutral';

    // 1. Perform Sentiment Analysis if transcript provided
    if (transcript) {
      const document = {
        content: transcript,
        type: 'PLAIN_TEXT',
      };
      const [result] = await languageClient.analyzeSentiment({ document });
      const score = result.documentSentiment.score;
      sentiment = score;
      if (score > 0.25) {
        routing = 'positive';
      } else if (score < -0.25) {
        routing = 'negative';
      }
    }

    // 2. Schedule Meeting via Google Calendar if scheduling data provided
    let meetLink = null;
    let eventLink = null;
    let eventId = null;

    if (title && start && end) {
      const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

      if (!tokensDoc.exists) {
        return NextResponse.json({ error: "Google OAuth not connected" }, { status: 401 });
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
          logRouteError("clients_meet", "/api/clients/meet error", err, "/api/clients/meet");
          return NextResponse.json({ error: "Token expired and refresh failed." }, { status: 401 });
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

      if (attendees && Array.isArray(attendees)) {
        event.attendees = attendees.map(email => ({ email }));
      }

      const created = await createCalendarEvent(accessToken, "primary", event);
      eventId = created.id;
      eventLink = created.htmlLink;
      meetLink = created.hangoutLink;
    }

    return NextResponse.json({
      message: "Clients meet processed",
      sentiment,
      routing,
      eventId,
      eventLink,
      meetLink,
      data: body
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating clients meet:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
