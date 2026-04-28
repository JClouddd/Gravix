import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logRouteError } from "@/lib/errorLogger";
import { DocumentServiceClient } from "@google-cloud/discoveryengine";

// Initialize Discovery Engine client outside the handler
const discoveryClient = new DocumentServiceClient();

/**
 * POST /api/webhooks/swarm-complete
 * Webhook hit by the Cloud Run Swarm when a video finishes chunking and is ingested into BigQuery.
 * Updates Firestore stats to trigger real-time UI reactions and forces Vertex AI to sync.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { vid_id, title } = body;

    if (!vid_id) {
      return Response.json({ error: "Missing vid_id" }, { status: 400 });
    }

    // 1. Force Real-Time Vertex AI Import
    try {
      const parent = discoveryClient.branchPath("antigravity-hub-jcloud", "global", "video-masterclass-lake", "0");
      const importRequest = {
        parent,
        bigquerySource: {
          projectId: "antigravity-hub-jcloud",
          datasetId: "antigravity_lake",
          tableId: "omni_vault",
          dataSchema: "custom" // or structured depending on GCP config
        },
        reconciliationMode: "INCREMENTAL" // Only imports new/changed rows
      };

      // We don't await the long-running operation here, just trigger it asynchronously
      discoveryClient.importDocuments(importRequest).catch(err => {
        console.error("[Webhook] Discovery Engine async import failed:", err.message);
      });
      console.log(`[Webhook] Realtime Vertex AI import triggered for: ${title || vid_id}`);
    } catch (err) {
      console.warn("[Webhook] Failed to trigger Vertex AI import:", err.message);
    }

    // 2. Increment global videos ingested counter
    await adminDb.collection("system").doc("knowledge_stats").set(
      {
        videosIngested: FieldValue.increment(1),
        lastVideoIngestedTitle: title || "Unknown Title",
        lastIngest: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Optionally add a notification/activity log to Firestore
    await adminDb.collection("activity_logs").add({
      type: "knowledge_ingestion",
      title: "Video Swarm Completed",
      message: `Successfully ingested video into BigQuery & Synced Brain: ${title || vid_id}`,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
    });

    return Response.json({ success: true, message: "Stats updated and sync triggered successfully" });
  } catch (error) {
    console.error("[/api/webhooks/swarm-complete]", error);
    logRouteError("webhook", "/api/webhooks/swarm-complete error", error, "/api/webhooks/swarm-complete");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
