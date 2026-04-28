import { DOCUMENTATION_SOURCES } from "@/lib/knowledgeEngine";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/knowledge/sync-all
 * Endpoint designed to be hit by Google Cloud Scheduler daily.
 * Iterates through DOCUMENTATION_SOURCES and triggers the ingestion pipeline for each.
 */
export async function POST(request) {
  try {
    const results = [];
    
    // We get the base URL to make internal API calls
    const baseUrl = new URL("/", request.url).toString();

    for (const source of DOCUMENTATION_SOURCES) {
      try {
        console.log(`[sync-all] Triggering sync for: ${source.name} (${source.url})`);
        
        const res = await fetch(`${baseUrl}api/knowledge/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: source.url,
            type: "url",
            title: source.name,
            source: "scheduled"
          })
        });

        const data = await res.json();
        
        results.push({
          id: source.id,
          name: source.name,
          success: res.ok,
          message: res.ok ? "Staged successfully" : data.error
        });
      } catch (err) {
        console.error(`[sync-all] Failed to sync ${source.name}:`, err.message);
        results.push({
          id: source.id,
          name: source.name,
          success: false,
          message: err.message
        });
      }
    }

    // Update the Cloud Scheduler status in Firestore so the UI sees it's active
    await adminDb.collection("system").doc("knowledge_stats").set({
      lastScheduledSync: new Date().toISOString(),
      schedulerActive: true
    }, { merge: true });

    return Response.json({
      success: true,
      message: `Processed ${DOCUMENTATION_SOURCES.length} sources`,
      results
    });
  } catch (error) {
    console.error("[/api/knowledge/sync-all]", error);
    logRouteError("scheduler", "/api/knowledge/sync-all error", error, "/api/knowledge/sync-all");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Also allow GET for easier manual triggering / testing
 */
export async function GET(request) {
  return POST(request);
}
