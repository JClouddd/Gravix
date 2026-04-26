import { listContacts, createContact, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

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
        logRouteError("clients_contacts", "/api/clients/contacts error", err, "/api/clients/contacts");
        return Response.json({
          connected: false,
          connectUrl: "/api/auth/connect",
          contacts: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const contactsResponse = await listContacts(accessToken);
    const connections = contactsResponse.connections || [];

    // Map the response to a simpler format for UI
    const mappedContacts = connections.map(person => {
      const name = person.names?.[0]?.displayName || "Unknown";
      const email = person.emailAddresses?.[0]?.value || "";
      const phone = person.phoneNumbers?.[0]?.value || "";
      const organization = person.organizations?.[0]?.name || "";
      return {
        resourceName: person.resourceName,
        name,
        email,
        phone,
        organization
      };
    });

    return Response.json({
      connected: true,
      contacts: mappedContacts,
    });
  } catch (error) {
    console.error("[/api/clients/contacts GET]", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        contacts: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ connected: false, message: "Not connected" }, { status: 401 });
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
        logRouteError("clients_contacts", "/api/clients/contacts error", err, "/api/clients/contacts");
        return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    const body = await request.json();

    // Convert to Google People API format
    const contactData = {
      names: [{
        givenName: body.firstName || body.name || "",
        familyName: body.lastName || ""
      }]
    };

    if (body.email) {
      contactData.emailAddresses = [{ value: body.email }];
    }

    if (body.phone) {
      contactData.phoneNumbers = [{ value: body.phone }];
    }

    if (body.organization) {
      contactData.organizations = [{ name: body.organization }];
    }

    const newContact = await createContact(accessToken, contactData);

    // Store sync metadata in Firestore contacts_sync
    await adminDb.collection("contacts_sync").add({
      resourceName: newContact.resourceName,
      syncedAt: new Date().toISOString(),
      name: body.name || body.firstName || "Unknown",
      email: body.email || "",
      status: "success"
    });

    return Response.json({ success: true, contact: newContact });
  } catch (error) {
    console.error("[/api/clients/contacts POST]", error);
    logRouteError("clients_contacts", "/api/clients/contacts error", error, "/api/clients/contacts");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
