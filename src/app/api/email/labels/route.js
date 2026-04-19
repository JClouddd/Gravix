import { listGmailLabels, createGmailLabel, refreshAccessToken } from "@/lib/googleAuth";
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

export async function GET(request) {
  try {
    const accessToken = await getAccessToken();
    const result = await listGmailLabels(accessToken);

    // Filter to only return user labels
    const userLabels = (result.labels || []).filter(label => label.type === "user");

    return Response.json({ labels: userLabels });
  } catch (error) {
    console.error("[/api/email/labels GET]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, backgroundColor, textColor } = await request.json();

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const result = await createGmailLabel(accessToken, name, backgroundColor, textColor);

    return Response.json({ success: true, label: result });
  } catch (error) {
    console.error("[/api/email/labels POST]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
