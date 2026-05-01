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

    // We assume the stored OAuth data corresponds to the required client/tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: oauthData.accessToken,
      refresh_token: oauthData.refreshToken,
    });

    const people = google.people({ version: 'v1', auth: oauth2Client });

    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 100,
      personFields: 'names,emailAddresses,phoneNumbers',
    });

    const connections = response.data.connections || [];

    return NextResponse.json({ contacts: connections }, { status: 200 });

  } catch (error) {
    console.error("Error fetching clients contacts:", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, givenName, familyName, emailAddress, phoneNumber } = body;

    if (!userId || !givenName) {
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

    const people = google.people({ version: 'v1', auth: oauth2Client });

    const newContact = {
      names: [{ givenName, familyName }],
      emailAddresses: emailAddress ? [{ value: emailAddress }] : [],
      phoneNumbers: phoneNumber ? [{ value: phoneNumber }] : [],
    };

    const response = await people.people.createContact({
      requestBody: newContact,
    });

    return NextResponse.json({ contact: response.data }, { status: 201 });

  } catch (error) {
    console.error("Error creating clients contact:", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
