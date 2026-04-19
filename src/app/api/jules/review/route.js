import { listSessions, getSession, sendActivity } from "@/lib/julesClient";

/**
 * GET  /api/jules/review — Fetch all sessions with their current status
 * POST /api/jules/review — Auto-approve or manually review a session
 *
 * Status flow: CREATED → PLAN_READY → IN_PROGRESS → PR_CREATED → COMPLETED
 * Sessions needing review show status "AWAITING_USER_FEEDBACK" or "PLAN_READY"
 */

export async function GET() {
  try {
    const sessionsData = await listSessions();
    const sessions = sessionsData?.sessions || [];

    // Categorize sessions
    const needsReview = [];
    const inProgress = [];
    const completed = [];
    const failed = [];

    for (const session of sessions) {
      const state = (session.state || session.status || "").toUpperCase();
      const id = session.name || session.id;

      const entry = {
        id,
        title: session.title || session.prompt?.slice(0, 80) || "Untitled",
        state,
        createdAt: session.createTime || session.createdAt,
        updatedAt: session.updateTime || session.updatedAt,
        prompt: session.prompt || "",
      };

      if (state.includes("AWAITING") || state.includes("PLAN_READY") || state.includes("PAUSED")) {
        needsReview.push(entry);
      } else if (state.includes("PROGRESS") || state.includes("RUNNING") || state.includes("CREATED")) {
        inProgress.push(entry);
      } else if (state.includes("COMPLETED") || state.includes("DONE") || state.includes("SUCCESS")) {
        completed.push(entry);
      } else if (state.includes("FAILED") || state.includes("ERROR") || state.includes("CANCELLED")) {
        failed.push(entry);
      } else {
        // Unknown status — put in "in progress" as safe default
        inProgress.push(entry);
      }
    }

    return Response.json({
      summary: {
        total: sessions.length,
        needsReview: needsReview.length,
        inProgress: inProgress.length,
        completed: completed.length,
        failed: failed.length,
      },
      needsReview,
      inProgress,
      completed,
      failed,
    });
  } catch (error) {
    console.error("[/api/jules/review GET]", error);

    if (error.message.includes("JULES_API_KEY")) {
      return Response.json({
        error: "JULES_API_KEY not configured",
        summary: { total: 0, needsReview: 0, inProgress: 0, completed: 0, failed: 0 },
      }, { status: 503 });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { sessionId, action, message } = await request.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!action || !["approve", "reject", "message"].includes(action)) {
      return Response.json({
        error: "action must be one of: approve, reject, message",
      }, { status: 400 });
    }

    // Get current session state first
    const session = await getSession(sessionId);
    const state = (session.state || session.status || "").toUpperCase();

    // Only approve/reject if session is actually awaiting feedback
    if (action === "approve" || action === "reject") {
      const isAwaitingReview = state.includes("AWAITING") || state.includes("PLAN_READY") || state.includes("PAUSED");
      if (!isAwaitingReview) {
        return Response.json({
          error: `Session is in state "${state}" — cannot ${action}. Only sessions awaiting review can be approved/rejected.`,
          currentState: state,
        }, { status: 409 });
      }
    }

    const result = await sendActivity(sessionId, {
      type: action,
      content: message || "",
    });

    return Response.json({
      success: true,
      action,
      sessionId,
      result,
    });
  } catch (error) {
    console.error("[/api/jules/review POST]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
