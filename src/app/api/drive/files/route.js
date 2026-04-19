import { listDriveFiles, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        message: "Google Drive is not connected.",
        files: [],
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
          message: "Token expired and refresh failed. Please reconnect.",
          files: [],
        });
      }
    }

    const result = await listDriveFiles(accessToken, q, pageSize);

    return Response.json({
      connected: true,
      files: result.files || [],
    });
  } catch (error) {
    console.error("[/api/drive/files]", error);

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        message: "Session expired. Please reconnect.",
        files: [],
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}
