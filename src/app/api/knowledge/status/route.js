import { DOCUMENTATION_SOURCES } from "@/lib/knowledgeEngine";

/**
 * GET /api/knowledge/status
 * Knowledge system health and stats
 */
export async function GET() {
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
    stats: {
      documentsIngested: 0,
      documentsStaged: 0,
      documentsApproved: 0,
      totalTokensUsed: 0,
      lastSync: null,
    },
    scheduledSources: DOCUMENTATION_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      status: "pending",
      lastIngested: null,
    })),
    scheduler: {
      cronExpression: "0 4 * * *",
      status: "not_configured",
      nextRun: null,
    },
  });
}
