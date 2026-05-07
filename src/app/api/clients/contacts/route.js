import { NextResponse } from 'next/server';
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";
import { listContacts, createContact, refreshAccessToken } from "@/lib/googleAuth";

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

    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get("pageSize")) || 100;

    const contactsData = await listContacts(accessToken, pageSize);

    return NextResponse.json(contactsData, { status: 200 });
  } catch (error) {
    console.error("Error fetching clients contacts:", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

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

    const createdContact = await createContact(accessToken, body);

    return NextResponse.json(createdContact, { status: 201 });
  } catch (error) {
    console.error("Error creating clients contact:", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
