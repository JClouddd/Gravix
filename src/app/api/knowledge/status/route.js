import { DOCUMENTATION_SOURCES } from "@/lib/knowledgeEngine";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/knowledge/status
 * Knowledge system health and stats — reads real data from Firestore
 */
export async function GET() {
  // Read stats from Firestore
  let stats = {
    documentsIngested: 0,
    documentsStaged: 0,
    documentsApproved: 0,
    videosIngested: 0,
    totalTokensUsed: 0,
    lastIngest: null,
  };

  try {
    const statsDoc = await adminDb.collection("system").doc("knowledge_stats").get();
    if (statsDoc.exists) {
      const data = statsDoc.data();
      stats = {
        documentsIngested: data.documentsIngested || 0,
        documentsStaged: data.documentsStaged || 0,
        documentsApproved: data.documentsApproved || 0,
        videosIngested: data.videosIngested || 0,
        totalTokensUsed: data.totalTokensUsed || 0,
        lastIngest: data.lastIngest?.toDate?.()?.toISOString() || null,
      };
    }
  } catch (err) {
    console.warn("[knowledge/status] Failed to read stats:", err.message);
  }

  // Check which sources have been ingested
  let sourceStatuses = {};
  try {
    const ingestedSnap = await adminDb
      .collection("ingestion")
      .where("source", "==", "scheduled")
      .get();
    ingestedSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.source && typeof data.source === "string") {
        // Match by URL stored in the entry's source field
        sourceStatuses[data.source] = {
          status: "ingested",
          ingestedAt: data.createdAt,
        };
      }
    });
  } catch (err) {
    console.warn("[knowledge/status] Failed to check source statuses:", err.message);
  }

  return Response.json({
    status: "operational",
    dataStore: {
      type: "vertex_ai",
      id: "gravix-knowledge",
      engineId: "gravix-scholar",
      bucket: "gs://gravix-knowledge-docs",
      region: "global",
      project: "antigravity-hub-jcloud",
      deployed: true,
    },
    stats,
    scheduledSources: DOCUMENTATION_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      status: sourceStatuses[s.url]?.status || "pending",
      lastIngested: sourceStatuses[s.url]?.ingestedAt || null,
    })),
    scheduler: {
      cronExpression: "0 4 * * *",
      status: "not_configured",
      nextRun: null,
    },
  });
}
