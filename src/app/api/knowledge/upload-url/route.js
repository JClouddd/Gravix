import { adminDb } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return Response.json({ error: "fileName and fileType are required" }, { status: 400 });
    }

    const bucketName = "gravix-knowledge-docs"; // Fallback to hardcoded bucket matching integration settings
    const bucket = getStorage(adminDb.app).bucket(bucketName);

    // Generate a v4 signed URL for uploading
    const [url] = await bucket.file(`ingestion/${fileName}`).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    return Response.json({
      success: true,
      url,
      gcsUri: `gs://${bucketName}/ingestion/${fileName}`
    });
  } catch (error) {
    console.error("[/api/knowledge/upload-url]", error);
    logRouteError("discovery", "/api/knowledge/upload-url error", error, "/api/knowledge/upload-url");
    return Response.json(
      { error: error.message || "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
