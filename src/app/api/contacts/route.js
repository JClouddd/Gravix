import { listContacts, createContact, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/contacts
 * Fetches contacts from Google People API
 */
export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        contacts: [],
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
          contacts: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const data = await listContacts(accessToken);
    return Response.json({
      connected: true,
      contacts: data.connections || [],
    });
  } catch (error) {
    console.error("[/api/contacts GET]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/contacts
 * Creates a new contact via Google People API
 */
export async function POST(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ error: "Not connected to Google OAuth" }, { status: 401 });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;

      await adminDb.collection("settings").doc("google_oauth").update({
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    }

    const body = await request.json();
    const { givenName, familyName, email, phone, organization } = body;

    const contactData = {
      names: [],
      emailAddresses: [],
      phoneNumbers: [],
      organizations: [],
    };

    if (givenName || familyName) {
      contactData.names.push({ givenName, familyName });
    }
    if (email) {
      contactData.emailAddresses.push({ value: email });
    }
    if (phone) {
      contactData.phoneNumbers.push({ value: phone });
    }
    if (organization) {
      contactData.organizations.push({ name: organization });
    }

    const result = await createContact(accessToken, contactData);

    return Response.json({ success: true, contact: result });
  } catch (error) {
    console.error("[/api/contacts POST]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
