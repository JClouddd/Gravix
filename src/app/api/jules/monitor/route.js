import {
  listSessions,
  getSession,
  approvePlan,
  sendMessage,
  listActivities,
  triggerTask,
} from "@/lib/julesClient";
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/jules/monitor — Monitor all Jules sessions and auto-handle ALL states
 *
 * Complete Jules API v1alpha state machine:
 *   QUEUED                       → no action, waiting to start
 *   PLANNING                    → no action, generating plan
 *   WAITING_FOR_PLAN_APPROVAL   → auto-approve via :approvePlan
 *   WAITING_FOR_USER_FEEDBACK   → send project context via sendMessage
 *   IN_PROGRESS                 → no action, working
 *   PAUSED                      → send resume message
 *   COMPLETED                   → no action, done
 *   FAILED                      → auto-retry if under 2 retries
 *   CANCELLED                   → log, no action
 *
 * POST /api/jules/monitor — Force action on a specific session
 *   Body: { sessionId, action?: "approve" | "retry" | "context" | "resume" | "activities" }
 */

const PROJECT_CONTEXT = `You are working on Gravix — a Next.js 16 app on Firebase App Hosting.

CRITICAL RULES:
- API routes: src/app/api/{feature}/route.js using named exports (GET, POST, etc.)
- All catch blocks MUST call logRouteError() from @/lib/errorLogger
- Firebase Admin: import { adminDb } from "@/lib/firebaseAdmin"
- OAuth tokens: Firestore doc at settings/google_oauth (accessToken, refreshToken, expiresAt)
- Google Workspace APIs: use src/lib/googleAuth.js for token management
- Gemini AI: use src/lib/geminiClient.js
- Client components: MUST have 'use client' directive, go in src/components/modules/
- CSS: vanilla CSS with CSS variables from globals.css — NO Tailwind
- NEVER run "npm run build" locally — Firebase App Hosting builds on push
- Run "npx next lint" before submitting changes
- All routes should return Response.json()
- Test files go in __tests__/ directories
- Use import aliases: @/lib/, @/components/`;

const ALL_STATES = [
  "QUEUED",
  "PLANNING",
  "WAITING_FOR_PLAN_APPROVAL",
  "WAITING_FOR_USER_FEEDBACK",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

export async function GET() {
  try {
    const { sessions = [] } = await listSessions();

    const results = {
      timestamp: new Date().toISOString(),
      total: sessions.length,
      actions: [],
      summary: {},
      unhandledStates: [],
    };

    // Initialize all known states to 0
    ALL_STATES.forEach((s) => (results.summary[s] = 0));
    results.summary.UNKNOWN = 0;

    for (const session of sessions) {
      const state = session.state || "UNKNOWN";
      const id = session.id || session.name?.split("/").pop();
      const title = session.title || "Untitled";

      // Count state
      if (results.summary[state] !== undefined) {
        results.summary[state]++;
      } else {
        results.summary.UNKNOWN++;
        results.unhandledStates.push({ state, title, id });
      }

      // Take action based on state
      try {
        switch (state) {
          case "WAITING_FOR_PLAN_APPROVAL": {
            // Use the dedicated :approvePlan endpoint
            await approvePlan(id);
            results.actions.push({
              session: id, title,
              action: "AUTO_APPROVED",
              detail: "Plan auto-approved via :approvePlan endpoint",
            });
            await logToFirestore(id, title, "plan_approved", "Plan auto-approved by monitor");
            break;
          }

          case "WAITING_FOR_USER_FEEDBACK": {
            // Send project context to unblock Jules
            await sendMessage(
              id,
              `Here is the project context to help you proceed:\n\n${PROJECT_CONTEXT}\n\nPlease continue with implementation. If you have a specific question, ask it clearly and I will answer.`
            );
            results.actions.push({
              session: id, title,
              action: "CONTEXT_SENT",
              detail: "Sent project context via sendMessage to unblock Jules",
            });
            await logToFirestore(id, title, "context_sent", "Auto-sent project context");
            break;
          }

          case "PAUSED": {
            // Resume paused sessions
            await sendMessage(
              id,
              "Please resume work. Here is the project context:\n\n" + PROJECT_CONTEXT
            );
            results.actions.push({
              session: id, title,
              action: "RESUMED",
              detail: "Sent resume message to paused session",
            });
            await logToFirestore(id, title, "resumed", "Auto-resumed paused session");
            break;
          }

          case "FAILED": {
            const retryCount = await getRetryCount(id);

            if (retryCount < 2) {
              try {
                const newSession = await triggerTask({
                  title: `[Retry ${retryCount + 1}] ${title}`,
                  prompt: `RETRY: The previous attempt failed. Please try again.\n\nOriginal task: ${title}\n\n${PROJECT_CONTEXT}\n\nIMPORTANT: Follow the patterns above strictly.`,
                  autoApprove: true,
                });

                results.actions.push({
                  session: id, title,
                  action: "AUTO_RETRIED",
                  detail: `Retry ${retryCount + 1}/2 triggered. New session: ${newSession.sessionId}`,
                  newSessionId: newSession.sessionId,
                });
                await logToFirestore(id, title, "failed", `Auto-retried (${retryCount + 1}/2) → ${newSession.sessionId}`);
              } catch (retryErr) {
                results.actions.push({
                  session: id, title,
                  action: "RETRY_FAILED",
                  detail: `Could not auto-retry: ${retryErr.message}`,
                });
              }
            } else {
              results.actions.push({
                session: id, title,
                action: "FAILED_EXHAUSTED",
                detail: "Task failed after 2 retries. Needs manual intervention.",
              });
              await logToFirestore(id, title, "failed_exhausted", "Max retries reached");
            }
            break;
          }

          case "CANCELLED": {
            results.actions.push({
              session: id, title,
              action: "CANCELLED_LOGGED",
              detail: "Session was cancelled — no action taken",
            });
            break;
          }

          // No action needed
          case "QUEUED":
          case "PLANNING":
          case "IN_PROGRESS":
          case "COMPLETED":
            break;

          default: {
            results.actions.push({
              session: id, title,
              action: "UNKNOWN_STATE",
              detail: `Unrecognized state: ${state}. Logged for review.`,
            });
            await logToFirestore(id, title, "unknown_state", `State: ${state}`);
            break;
          }
        }
      } catch (actionError) {
        results.actions.push({
          session: id, title,
          action: "ACTION_ERROR",
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
    const { sessionId, action: requestedAction } = await request.json();
    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    const state = session.state || "UNKNOWN";
    const title = session.title || "Untitled";

    let action = "NO_ACTION";
    let detail = `Session is ${state}`;
    let extra = {};

    switch (requestedAction) {
      case "approve": {
        await approvePlan(sessionId);
        action = "FORCE_APPROVED";
        detail = "Plan force-approved via POST";
        break;
      }

      case "context":
      case "resume": {
        await sendMessage(sessionId, PROJECT_CONTEXT);
        action = "FORCE_CONTEXT_SENT";
        detail = "Project context force-sent via POST";
        break;
      }

      case "retry": {
        const newSession = await triggerTask({
          title: `[Retry] ${title}`,
          prompt: `RETRY: Please try this task again.\n\nOriginal: ${title}\n\n${PROJECT_CONTEXT}`,
          autoApprove: true,
        });
        action = "FORCE_RETRIED";
        detail = `New session created: ${newSession.sessionId}`;
        extra = { newSessionId: newSession.sessionId };
        break;
      }

      case "activities": {
        // List activities for debugging/inspection
        const activities = await listActivities(sessionId);
        return Response.json({
          sessionId, title, state,
          action: "ACTIVITIES_LISTED",
          activities,
        });
      }

      default: {
        // Auto-detect action based on state
        if (state === "WAITING_FOR_PLAN_APPROVAL") {
          await approvePlan(sessionId);
          action = "AUTO_APPROVED";
          detail = "Plan approved via :approvePlan";
        } else if (state === "WAITING_FOR_USER_FEEDBACK" || state === "PAUSED") {
          await sendMessage(sessionId, PROJECT_CONTEXT);
          action = state === "PAUSED" ? "RESUMED" : "CONTEXT_SENT";
          detail = "Project context sent";
        }
        break;
      }
    }

    await logToFirestore(sessionId, title, action.toLowerCase(), detail);

    return Response.json({ sessionId, title, state, action, detail, ...extra });
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
    // Fire-and-forget
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
