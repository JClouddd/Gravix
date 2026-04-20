import { triggerTask, listSessions, getSession } from "@/lib/julesClient";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/jules/tasks — Trigger a Jules task
 * GET  /api/jules/tasks — List sessions / check status
 */

export async function POST(request) {
  try {
    const { prompt, title, repo, autoApprove = false } = await request.json();

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const result = await triggerTask({
      prompt,
      title: title || prompt.slice(0, 60),
      repo: repo || "JClouddd/Gravix",
      autoApprove,
    });

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[/api/jules/tasks]", error);
    logRouteError("jules", "/api/jules/tasks error", error, "/api/jules/tasks");

    // If the error is about missing API key, return a helpful message
    if (error.message.includes("JULES_API_KEY")) {
      return Response.json({
        success: false,
        error: "JULES_API_KEY not configured",
        setup: "Add JULES_API_KEY to your environment variables or .env.local file",
      }, { status: 503 });
    }

    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const session = await getSession(sessionId);
      return Response.json({ session });
    }

    const sessions = await listSessions();
    return Response.json(sessions);
  } catch (error) {
    console.error("[/api/jules/tasks GET]", error);
    logRouteError("jules", "/api/jules/tasks error", error, "/api/jules/tasks");

    if (error.message.includes("JULES_API_KEY")) {
      return Response.json({
        connected: false,
        error: "JULES_API_KEY not configured",
        setup: "Add JULES_API_KEY to your environment variables or .env.local file",
      }, { status: 503 });
    }

    return Response.json({
      connected: false,
      error: error.message,
    }, { status: 500 });
  }
}
