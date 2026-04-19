import { adminDb } from "@/lib/firebaseAdmin";
import { getMeetTranscript, refreshAccessToken } from "@/lib/googleAuth";

export async function GET(request, { params }) {
  try {
    const { conferenceId } = params;

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        transcript: { entries: [] },
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
          transcript: { entries: [] },
          message: "Token expired and refresh failed.",
        });
      }
    }

    const response = await getMeetTranscript(accessToken, conferenceId);
    return Response.json({
      connected: true,
      transcript: response,
    });
  } catch (error) {
    console.error("[/api/meet/transcripts/[conferenceId]]", error);

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        transcript: { entries: [] },
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}
