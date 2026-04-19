import { adminDb } from "@/lib/firebaseAdmin";
import { listMeetConferences, refreshAccessToken } from "@/lib/googleAuth";

export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        conferences: [],
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
          conferences: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const response = await listMeetConferences(accessToken);
    return Response.json({
      connected: true,
      conferences: response.conferenceRecords || [],
    });
  } catch (error) {
    console.error("[/api/meet/conferences]", error);

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        conferences: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}
