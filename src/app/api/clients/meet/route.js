import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';
import { logRouteError } from '@/lib/errorLogger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const oauthDoc = await adminDb.collection('settings').doc('google_oauth').get();
    if (!oauthDoc.exists) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 404 });
    }

    const oauthData = oauthDoc.data();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: oauthData.accessToken,
      refresh_token: oauthData.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    // Filter to those with meet links
    const meetEvents = events.filter(e => e.hangoutLink);

    return NextResponse.json({ events: meetEvents }, { status: 200 });

  } catch (error) {
    console.error("Error fetching clients meet events:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, summary, description, startDateTime, endDateTime, attendees } = body;

    if (!userId || !summary || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const oauthDoc = await adminDb.collection('settings').doc('google_oauth').get();
    if (!oauthDoc.exists) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 404 });
    }

    const oauthData = oauthDoc.data();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: oauthData.accessToken,
      refresh_token: oauthData.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York', // Could make this dynamic
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York',
      },
      attendees: attendees ? attendees.map(email => ({ email })) : [],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1, // Required to generate meet link
      requestBody: event,
    });

    return NextResponse.json({ event: response.data }, { status: 201 });

  } catch (error) {
    console.error("Error creating clients meet event:", error);
    logRouteError("clients_meet", "/api/clients/meet error", error, "/api/clients/meet");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
