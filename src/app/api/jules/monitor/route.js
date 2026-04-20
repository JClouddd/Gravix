import { listSessions, getSession, sendActivity } from "@/lib/julesClient";
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/jules/monitor — Monitor all Jules sessions and auto-handle states
 *
 * Checks every active session and takes action:
 *   - WAITING_FOR_PLAN_APPROVAL → auto-approves
 *   - WAITING_FOR_USER → sends project context + clarification
 *   - FAILED → logs error, re-triggers if under retry limit
 *   - COMPLETED → logs success
 *
 * POST /api/jules/monitor — Force re-check a specific session
 *   Body: { sessionId: string }
 */

const PROJECT_CONTEXT = `You are working on Gravix — a Next.js 16 app on Firebase App Hosting.

Key patterns:
- API routes: src/app/api/{feature}/route.js using named exports (GET, POST, etc.)
- All catch blocks must call logRouteError() from @/lib/errorLogger
- Firebase Admin: import { adminDb } from "@/lib/firebaseAdmin"
- OAuth tokens: Firestore settings/google_oauth (accessToken, refreshToken, expiresAt)
- Google APIs: use src/lib/googleAuth.js for token management
- Gemini: use src/lib/geminiClient.js
- Client components: 'use client' directive, go in src/components/modules/
- CSS: vanilla CSS with variables from globals.css
- Never run npm run build — Firebase App Hosting handles it
- Run npx next lint before committing`;

export async function GET() {
  try {
    const { sessions = [] } = await listSessions();

    const results = {
      timestamp: new Date().toISOString(),
      total: sessions.length,
      actions: [],
      summary: {
        in_progress: 0,
        completed: 0,
        failed: 0,
        waiting_approval: 0,
        waiting_user: 0,
        other: 0,
      },
    };

    for (const session of sessions) {
      const state = session.state || "UNKNOWN";
      const id = session.id || session.name?.split("/").pop();
      const title = session.title || "Untitled";

      // Count states
      if (state === "IN_PROGRESS") results.summary.in_progress++;
      else if (state === "COMPLETED") results.summary.completed++;
      else if (state === "FAILED") results.summary.failed++;
      else if (state === "WAITING_FOR_PLAN_APPROVAL") results.summary.waiting_approval++;
      else if (state === "WAITING_FOR_USER") results.summary.waiting_user++;
      else results.summary.other++;

      // Take action based on state
      try {
        if (state === "WAITING_FOR_PLAN_APPROVAL") {
          // Auto-approve the plan
          await sendActivity(id, { type: "approve" });
          results.actions.push({
            session: id,
            title,
            action: "AUTO_APPROVED",
            detail: "Plan auto-approved to proceed with implementation",
          });

          // Log to Firestore
          await logToFirestore(id, title, "plan_approved", "Plan auto-approved by monitor");

        } else if (state === "WAITING_FOR_USER") {
          // Send context to help Jules continue
          await sendActivity(id, {
            type: "message",
            content: `Here is the project context to help you proceed:\n\n${PROJECT_CONTEXT}\n\nPlease continue with your implementation. If you need a specific answer, state the exact question and I will provide it.`,
          });
          results.actions.push({
            session: id,
            title,
            action: "CONTEXT_SENT",
            detail: "Sent project context to unblock Jules",
          });

          await logToFirestore(id, title, "context_sent", "Auto-sent project context");

        } else if (state === "FAILED") {
          // Check if we already retried
          const retryCount = await getRetryCount(id);

          if (retryCount < 2) {
            // Log but don't auto-retry here — stale monitor handles retries
            results.actions.push({
              session: id,
              title,
              action: "FAILED_LOGGED",
              detail: `Task failed (retry ${retryCount}/2). Will be retried by stale monitor if linked to an issue.`,
              retryCount,
            });

            await logToFirestore(id, title, "failed", `Task failed — retry ${retryCount}/2`);
          } else {
            results.actions.push({
              session: id,
              title,
              action: "FAILED_EXHAUSTED",
              detail: "Task failed after 2 retries. Requires manual intervention.",
            });

            await logToFirestore(id, title, "failed_exhausted", "Max retries reached");
          }
        }
      } catch (actionError) {
        results.actions.push({
          session: id,
          title,
          action: "ERROR",
          detail: actionError.message,
        });
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error("[/api/jules/monitor GET]", error);
    logRouteError("jules", "/api/jules/monitor error", error, "/api/jules/monitor");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    const state = session.state || "UNKNOWN";
    const title = session.title || "Untitled";

    let action = "NO_ACTION";
    let detail = `Session is ${state}`;

    if (state === "WAITING_FOR_PLAN_APPROVAL") {
      await sendActivity(sessionId, { type: "approve" });
      action = "AUTO_APPROVED";
      detail = "Plan approved";
    } else if (state === "WAITING_FOR_USER") {
      await sendActivity(sessionId, {
        type: "message",
        content: PROJECT_CONTEXT,
      });
      action = "CONTEXT_SENT";
      detail = "Project context sent";
    }

    return Response.json({
      sessionId,
      title,
      state,
      action,
      detail,
    });
  } catch (error) {
    console.error("[/api/jules/monitor POST]", error);
    logRouteError("jules", "/api/jules/monitor POST error", error, "/api/jules/monitor");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

async function logToFirestore(sessionId, title, action, detail) {
  try {
    const db = adminDb();
    await db.collection("jules_monitor_log").add({
      sessionId,
      title,
      action,
      detail,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Fire-and-forget — don't crash monitor
  }
}

async function getRetryCount(sessionId) {
  try {
    const db = adminDb();
    const snaps = await db
      .collection("jules_monitor_log")
      .where("sessionId", "==", sessionId)
      .where("action", "==", "failed")
      .get();
    return snaps.size;
  } catch {
    return 0;
  }
}
