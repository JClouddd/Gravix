/**
 * POST /api/jules/trigger — Create a Jules task programmatically
 * GET /api/jules/status — Check Jules task progress
 */

export async function POST(request) {
  try {
    const { description, repo = "JClouddd/Antigravity-Hub", branch, priority = "normal" } = await request.json();

    if (!description) {
      return Response.json({ error: "description is required" }, { status: 400 });
    }

    // TODO: Wire to Jules API once connected (Phase 2 manual step)
    const task = {
      id: `jules_${Date.now()}`,
      description,
      repo,
      branch: branch || `jules/${Date.now()}`,
      priority,
      status: "pending",
      createdAt: new Date().toISOString(),
      estimatedDuration: "5-15 min",
      prUrl: null,
    };

    return Response.json({
      success: true,
      task,
      message: "Jules task created. Connect Jules to GitHub (Phase 2) to enable execution.",
    });
  } catch (error) {
    console.error("[/api/jules/trigger]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    connected: false,
    message: "Jules is not yet connected. Complete Phase 2 to enable.",
    activeTasks: [],
    completedTasks: [],
    stats: {
      totalTasks: 0,
      successRate: 0,
      avgDuration: null,
    },
  });
}
