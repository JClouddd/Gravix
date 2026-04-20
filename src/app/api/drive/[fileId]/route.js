import { refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";
import { google } from "googleapis";

function getDriveClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

/**
 * GET /api/drive/[fileId] - Downloads or views a file
 */
export async function GET(req, { params }) {
  try {
    const { fileId } = params;
    if (!fileId) {
      return Response.json({ error: "No fileId provided" }, { status: 400 });
    }

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
        logRouteError("drive", "Token refresh failed", err, "/api/drive/[fileId]");
        return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    const drive = getDriveClient(accessToken);

    // Get metadata first to see what kind of file it is
    const metadataResponse = await drive.files.get({
        fileId: fileId,
        fields: "id, name, mimeType, webViewLink, webContentLink"
    });

    const metadata = metadataResponse.data;

    if (metadata.mimeType && metadata.mimeType.startsWith('application/vnd.google-apps.')) {
        return Response.json({ file: metadata, redirect: metadata.webViewLink });
    }

    return Response.json({ file: metadata, redirect: metadata.webContentLink || metadata.webViewLink });

  } catch (error) {
    console.error("[/api/drive/[fileId] GET]", error);
    logRouteError("drive", "/api/drive/[fileId] GET error", error, "/api/drive/[fileId]");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/drive/[fileId] - Trashes a file
 */
export async function DELETE(req, { params }) {
  try {
    const { fileId } = params;
    if (!fileId) {
      return Response.json({ error: "No fileId provided" }, { status: 400 });
    }

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
        logRouteError("drive", "Token refresh failed", err, "/api/drive/[fileId]");
        return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    const drive = getDriveClient(accessToken);

    // Trash the file instead of permanent delete for safety
    const response = await drive.files.update({
        fileId: fileId,
        requestBody: {
            trashed: true
        }
    });

    return Response.json({ success: true, file: response.data });
  } catch (error) {
    console.error("[/api/drive/[fileId] DELETE]", error);
    logRouteError("drive", "/api/drive/[fileId] DELETE error", error, "/api/drive/[fileId]");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
