import { applyGmailLabel, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

async function getAccessToken() {
  const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
  if (!tokensDoc.exists) {
    throw new Error("Gmail is not connected.");
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

  return accessToken;
}

export async function POST(request) {
  try {
    const { messageId, addLabelIds, removeLabelIds } = await request.json();

    if (!messageId) {
      return Response.json({ error: "messageId is required" }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    await applyGmailLabel(accessToken, messageId, addLabelIds || [], removeLabelIds || []);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[/api/email/labels/apply POST]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
