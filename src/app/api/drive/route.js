import { refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";
import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

/**
 * GET /api/drive - Lists files from Google Drive
 */
export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ connected: false, files: [] });
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
        logRouteError("drive", "Token refresh failed", err, "/api/drive");
        return Response.json({
          connected: false,
          files: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const drive = getDriveClient(accessToken);
    const response = await drive.files.list({
      pageSize: 20,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, parents)",
      orderBy: "modifiedTime desc"
    });

    return Response.json({ connected: true, files: response.data.files || [] });
  } catch (error) {
    console.error("[/api/drive GET]", error);
    logRouteError("drive", "/api/drive GET error", error, "/api/drive");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/drive - Uploads a file to Google Drive using multipart upload
 */
export async function POST(req) {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ error: "Google OAuth not connected." }, { status: 401 });
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
        logRouteError("drive", "Token refresh failed", err, "/api/drive");
        return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const drive = getDriveClient(accessToken);

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
    });

    return Response.json({ file: response.data });
  } catch (error) {
    console.error("[/api/drive POST]", error);
    logRouteError("drive", "/api/drive POST error", error, "/api/drive");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
