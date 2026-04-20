import {
  listSessions,
  getSession,
  approvePlan,
  sendMessage,
  cancelSession,
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
  "AWAITING_PLAN_APPROVAL",
  "WAITING_FOR_PLAN_APPROVAL",
  "AWAITING_USER_FEEDBACK",
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

    // Build a set of completed task titles (without retry prefix) for orphan detection
    const completedTitles = new Set(
      sessions
        .filter((s) => s.state === "COMPLETED")
        .map((s) => (s.title || "").replace(/^\[Retry\s*\d*\]\s*/i, "").trim().toLowerCase())
    );

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

      // Orphan detection: if this is a retry and the original task already completed, cancel it
      const isRetry = /^\[Retry/i.test(title);
      const originalTitle = title.replace(/^\[Retry\s*\d*\]\s*/i, "").trim().toLowerCase();
      if (isRetry && state !== "COMPLETED" && state !== "CANCELLED" && completedTitles.has(originalTitle)) {
        try {
          await cancelSession(id);
          results.actions.push({
            session: id, title,
            action: "ORPHAN_CANCELLED",
            detail: `Original task already completed — cancelled orphaned retry`,
          });
          await logToFirestore(id, title, "orphan_cancelled", "Original task completed, retry is redundant");
          continue; // Skip further processing
        } catch (cancelErr) {
          results.actions.push({
            session: id, title,
            action: "ORPHAN_CANCEL_FAILED",
            detail: `Tried to cancel orphan but failed: ${cancelErr.message}`,
          });
        }
      }

      // Take action based on state
      try {
        switch (state) {
          case "AWAITING_PLAN_APPROVAL":
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

          case "AWAITING_USER_FEEDBACK":
          case "WAITING_FOR_USER_FEEDBACK": {
            // Check if we already responded to this session (avoid spam)
            const alreadyAnswered = await checkAlreadyAnswered(id);
            if (alreadyAnswered) {
              results.actions.push({
                session: id, title,
                action: "FEEDBACK_ALREADY_SENT",
                detail: "Already sent context to this session — skipping to avoid spam loop",
              });
              break;
            }

            // Fetch latest activities to see what Jules is actually asking
            let julesQuestion = "";
            try {
              const activities = await listActivities(id);
              const actList = activities.activities || [];
              // Find the last agent message (Jules' question)
              const lastAgentMsg = [...actList]
                .reverse()
                .find((a) => a.agentMessage || a.message?.role === "agent");
              if (lastAgentMsg) {
                julesQuestion = lastAgentMsg.agentMessage?.message
                  || lastAgentMsg.message?.content
                  || JSON.stringify(lastAgentMsg).slice(0, 500);
              }
            } catch {
              // If activities fail, send generic context
            }

            // Build a smart response based on what Jules is asking
            const smartResponse = buildSmartResponse(title, julesQuestion);

            await sendMessage(id, smartResponse);
            results.actions.push({
              session: id, title,
              action: "SMART_CONTEXT_SENT",
              detail: julesQuestion
                ? `Answered Jules' question. Q: ${julesQuestion.slice(0, 100)}...`
                : "Sent project context (no specific question detected)",
            });
            await logToFirestore(id, title, "context_sent", smartResponse.slice(0, 300));
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
              // Check if this belongs to a pipeline -> Sentinel self-healing
              const lockSnap = await db
                .collection("jules_file_locks")
                .where("sessionId", "==", `sessions/${id}`)
                .limit(1)
                .get();

              const lockData = lockSnap.empty ? null : lockSnap.docs[0].data();

              if (lockData?.pipelineId) {
                const healResult = await handlePipelineTaskFailure(id, title, lockData.pipelineId);
                results.actions.push({
                  session: id, title,
                  action: healResult.action || "SENTINEL_HEAL_ATTEMPT",
                  detail: healResult.detail || "Sentinel self-healing triggered",
                  pipelineId: lockData.pipelineId,
                });
                await logToFirestore(id, title, "sentinel_healing", healResult.detail);
              } else {
                results.actions.push({
                  session: id, title,
                  action: "FAILED_EXHAUSTED",
                  detail: "Task failed after 2 retries. Needs manual intervention.",
                });
                await logToFirestore(id, title, "failed_exhausted", "Max retries reached");
              }
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

          // No action needed for these active states
          case "QUEUED":
          case "PLANNING":
          case "IN_PROGRESS":
            break;

          case "COMPLETED": {
            // Release file locks and auto-trigger queued tasks
            try {
              const releaseResult = await releaseLocksAndPromoteQueue(id, title);
              if (releaseResult.released || releaseResult.triggered > 0) {
                results.actions.push({
                  session: id, title,
                  action: "LOCKS_RELEASED",
                  detail: `Released ${releaseResult.released} lock(s), triggered ${releaseResult.triggered} queued task(s)`,
                  triggeredTasks: releaseResult.triggeredTasks,
                });
              }
            } catch (lockErr) {
              // Lock release is best-effort — don't break monitoring
              console.error("[monitor] Lock release error:", lockErr.message);
            }

            // Check if this session belongs to a pipeline and advance if ready
            try {
              const pipelineResult = await checkAndAdvancePipelines(id, title);
              if (pipelineResult.action) {
                results.actions.push({
                  session: id, title,
                  action: pipelineResult.action,
                  detail: pipelineResult.detail,
                  pipelineId: pipelineResult.pipelineId,
                });
              }
            } catch (pipeErr) {
              console.error("[monitor] Pipeline check error:", pipeErr.message);
            }
            break;
          }

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
    // ── Pipeline sweep: check merging waves even if no sessions just completed ──
    try {
      const db = adminDb();
      const mergingPipes = await db
        .collection("jules_pipelines")
        .where("status", "in", ["running", "merging"])
        .get();

      for (const pipeDoc of mergingPipes.docs) {
        const pipeline = pipeDoc.data();
        const currentWave = pipeline.waves[pipeline.currentWave];

        if (currentWave?.status === "merging") {
          const mergeResult = await checkWavePRsMerged(currentWave, pipeline.currentWave + 1);
          const mergeStarted = new Date(currentWave.mergeCheckStartedAt).getTime();
          const elapsed = Date.now() - mergeStarted;
          const GRACE_MS = 5 * 60 * 1000;

          if (mergeResult.allMerged && elapsed >= GRACE_MS) {
            currentWave.status = "completed";
            currentWave.completedAt = new Date().toISOString();

            const nextWaveIdx = pipeline.currentWave + 1;

            if (nextWaveIdx >= pipeline.totalWaves) {
              pipeline.status = "completed";
              results.actions.push({
                session: "pipeline-sweep", title: pipeline.name,
                action: "PIPELINE_COMPLETED",
                detail: `🎉 Pipeline "${pipeline.name}" completed! All ${pipeline.totalWaves} waves finished.`,
                pipelineId: pipeDoc.id,
              });
            } else {
              pipeline.currentWave = nextWaveIdx;
              const nextWave = pipeline.waves[nextWaveIdx];
              nextWave.status = "running";
              nextWave.triggeredAt = new Date().toISOString();

              for (let i = 0; i < nextWave.tasks.length; i++) {
                const task = nextWave.tasks[i];
                try {
                  const res = await fetch(`${BASE_URL}/api/jules/trigger`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      prompt: task.prompt,
                      title: task.title,
                      files: task.files,
                      fileLocks: task.fileLocks,
                      autoApprove: task.autoApprove,
                      acceptanceCriteria: task.acceptanceCriteria,
                      _pipelineId: pipeDoc.id,
                      _waveNumber: nextWaveIdx,
                    }),
                  });
                  const trigResult = await res.json();
                  if (trigResult.sessionId) {
                    task.sessionId = trigResult.sessionId.replace("sessions/", "");
                    task.status = "triggered";
                    task.triggeredAt = new Date().toISOString();
                  }
                } catch (err) {
                  task.status = "failed";
                  task.error = err.message;
                }
              }

              results.actions.push({
                session: "pipeline-sweep", title: pipeline.name,
                action: "PIPELINE_WAVE_ADVANCED",
                detail: `Wave ${pipeline.currentWave + 1} of ${pipeline.totalWaves} triggered (grace period done).`,
                pipelineId: pipeDoc.id,
              });
            }

            pipeline.updatedAt = new Date().toISOString();
            await pipeDoc.ref.update({
              waves: pipeline.waves,
              currentWave: pipeline.currentWave,
              status: pipeline.status,
              updatedAt: pipeline.updatedAt,
            });
          }
        }
      }
    } catch (sweepErr) {
      console.error("[monitor] Pipeline sweep error:", sweepErr.message);
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

      case "cancel": {
        await cancelSession(sessionId);
        action = "FORCE_CANCELLED";
        detail = "Session cancelled via POST";
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
        if (state === "AWAITING_PLAN_APPROVAL" || state === "WAITING_FOR_PLAN_APPROVAL") {
          await approvePlan(sessionId);
          action = "AUTO_APPROVED";
          detail = "Plan approved via :approvePlan";
        } else if (state === "AWAITING_USER_FEEDBACK" || state === "WAITING_FOR_USER_FEEDBACK" || state === "PAUSED") {
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

async function checkAlreadyAnswered(sessionId) {
  try {
    const db = adminDb();
    const snaps = await db
      .collection("jules_monitor_log")
      .where("sessionId", "==", sessionId)
      .where("action", "==", "context_sent")
      .limit(1)
      .get();
    return !snaps.empty;
  } catch {
    return false;
  }
}

/**
 * Build an intelligent response based on what Jules is asking.
 * Reads the task title and Jules' question to provide codebase-specific answers
 * instead of just dumping the full PROJECT_CONTEXT.
 */
function buildSmartResponse(title, julesQuestion) {
  const question = (julesQuestion || "").toLowerCase();
  const taskTitle = (title || "").toLowerCase();
  let specificGuidance = "";

  // Pattern: "I don't see X file" / "Where is X" / "Should I create X"
  if (question.includes("don't see") || question.includes("not found") || question.includes("should i create") || question.includes("does not exist")) {
    specificGuidance = `If you cannot find the file mentioned in the task, CREATE IT. This is a greenfield task — new files are expected. Follow these conventions:
- Components: src/components/modules/{ModuleName}.js (with 'use client' directive)
- Sub-components: src/components/modules/{feature}/{ComponentName}.js
- API routes: src/app/api/{feature}/route.js (named exports: GET, POST, etc.)
- Shared libs: src/lib/{name}.js

Do NOT ask for clarification about missing files — create them.`;
  }

  // Pattern: "Which component" / "Which file" / "Where should I"
  if (question.includes("which component") || question.includes("which file") || question.includes("would you like me to")) {
    specificGuidance = `Use your best judgment. Here's the project structure:

EXISTING MODULES:
- src/components/modules/KnowledgeModule.js — Brain vault, Scholar chat, Drive
  - Sub-tabs: src/components/modules/knowledge/{Tab}.js
- src/components/modules/AgentsModule.js — AI agent management
- src/components/modules/ColabModule.js — Notebook management
- src/components/modules/EmailModule.js — Gmail integration
- src/components/modules/CalendarModule.js — Calendar
- src/components/modules/ClientsModule.js — Contacts
- src/components/modules/FinanceModule.js — Finance

EXISTING API ROUTES:
- src/app/api/gemini/chat/route.js — Gemini chat endpoint
- src/app/api/knowledge/* — Knowledge engine
- src/app/api/jules/* — Jules pipeline
- src/app/api/drive/* — Google Drive
- src/app/api/contacts/* — Contacts
- src/app/api/agents/* — Agent management

If the task mentions a "widget" or standalone component, create a new file.
If it mentions modifying existing functionality, update the relevant module above.
Prefer creating new files over modifying existing ones to avoid merge conflicts.`;
  }

  // Pattern: GeminiWidget specifically
  if (taskTitle.includes("gemini") && (taskTitle.includes("widget") || taskTitle.includes("chat"))) {
    specificGuidance += `\n\nSPECIFIC TO THIS TASK:
- There is NO existing GeminiWidget.js — CREATE one at src/components/modules/knowledge/GeminiWidget.js
- The chat backend is at src/app/api/gemini/chat/route.js (already exists)
- The existing Scholar chat is at src/components/modules/knowledge/ScholarChatTab.js
  (uses /api/knowledge/review — do NOT modify this)
- For model toggle: use gemini-2.5-flash and gemini-2.5-pro as options
- For cost display: show estimated token count and model price per 1M tokens
- Wire the new GeminiWidget to /api/gemini/chat endpoint`;
  }

  // Pattern: "endpoint" / "API" questions
  if (question.includes("endpoint") || question.includes("/api/")) {
    specificGuidance += `\n\nAPI ENDPOINT GUIDANCE:
- Use the endpoint specified in the task title/description
- If no endpoint exists, create one at src/app/api/{feature}/route.js
- All API routes must use Response.json() for responses
- All catch blocks must call logRouteError() from @/lib/errorLogger`;
  }

  // Default: if no specific guidance matched, use general direction
  if (!specificGuidance) {
    specificGuidance = `Please proceed with your best judgment. Create any files that don't exist. Use the project structure above for guidance. If you're unsure between two approaches, pick the one that requires fewer changes to existing files.`;
  }

  return `AUTOMATED RESPONSE — Project Context & Guidance

${PROJECT_CONTEXT}

TASK-SPECIFIC GUIDANCE:
${specificGuidance}

IMPORTANT: Do NOT ask for further clarification. Make decisions autonomously and proceed with implementation. Create any files that don't exist. Submit your changes when done.`;
}

/**
 * Release file locks for a completed session and auto-trigger
 * any queued tasks that were blocked by those locks.
 */
async function releaseLocksAndPromoteQueue(sessionId, title) {
  const db = adminDb();
  const result = { released: 0, triggered: 0, triggeredTasks: [] };

  // Find and delete active locks for this session
  const lockSnap = await db
    .collection("jules_file_locks")
    .where("status", "==", "active")
    .where("sessionId", "==", sessionId)
    .get();

  for (const doc of lockSnap.docs) {
    await doc.ref.delete();
    result.released++;
  }

  if (result.released === 0) return result;

  // Find queued tasks that were blocked by this session
  const queueSnap = await db
    .collection("jules_file_locks")
    .where("status", "==", "queued")
    .where("blockedBy", "array-contains", sessionId)
    .get();

  for (const doc of queueSnap.docs) {
    const queued = doc.data();

    // Remove this session from blockedBy
    const remainingBlockers = (queued.blockedBy || []).filter((id) => id !== sessionId);

    if (remainingBlockers.length > 0) {
      // Still blocked by other sessions — update but don't trigger
      await doc.ref.update({ blockedBy: remainingBlockers });
      continue;
    }

    // No more blockers — trigger the task!
    try {
      // Re-check for new conflicts (tasks created after this one was queued)
      const currentActiveSnap = await db
        .collection("jules_file_locks")
        .where("status", "==", "active")
        .get();

      let hasNewConflict = false;
      for (const activeLock of currentActiveSnap.docs) {
        const active = activeLock.data();
        const activeFiles = active.fileLocks || [];
        const queuedFiles = queued.fileLocks || [];

        for (const qf of queuedFiles) {
          for (const af of activeFiles) {
            if (qf === af || qf.startsWith(af + "/") || af.startsWith(qf + "/")) {
              hasNewConflict = true;
              break;
            }
          }
          if (hasNewConflict) break;
        }
        if (hasNewConflict) break;
      }

      if (hasNewConflict) {
        // New conflict appeared — keep queued
        continue;
      }

      // Actually trigger the task via the internal trigger logic
      const triggerResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app"}/api/jules/trigger`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: queued.prompt,
            title: queued.title,
            files: queued.files || [],
            fileLocks: queued.fileLocks || [],
            autoApprove: queued.autoApprove !== false,
            acceptanceCriteria: queued.acceptanceCriteria || "",
          }),
        }
      );

      const triggerResult = await triggerResponse.json();

      if (triggerResult.success && !triggerResult.queued) {
        // Successfully triggered — delete the queue entry
        await doc.ref.delete();
        result.triggered++;
        result.triggeredTasks.push({
          title: queued.title,
          sessionId: triggerResult.sessionId,
        });

        await logToFirestore(
          triggerResult.sessionId,
          queued.title,
          "queue_promoted",
          `Auto-triggered after ${title} (${sessionId}) completed`
        );
      }
    } catch (triggerErr) {
      console.error("[monitor] Failed to auto-trigger queued task:", triggerErr.message);
      // Don't delete queue entry — it'll be retried next monitor cycle
    }
  }

  return result;
}

/**
 * Check if a completed session belongs to a pipeline and advance waves.
 *
 * Flow:
 *   1. Find pipeline containing this sessionId
 *   2. Mark task as completed
 *   3. If all tasks in wave completed → set wave to "merging"
 *   4. For "merging" waves → check if PRs are merged via GitHub API
 *   5. If all merged + 5 min grace → trigger next wave
 *   6. If task failed after retries → Sentinel diagnose → auto-fix
 */
async function checkAndAdvancePipelines(sessionId, title) {
  const db = adminDb();
  const result = { action: null, detail: null, pipelineId: null };

  // Find running pipelines
  const pipeSnap = await db
    .collection("jules_pipelines")
    .where("status", "in", ["running", "merging"])
    .get();

  if (pipeSnap.empty) return result;

  for (const pipeDoc of pipeSnap.docs) {
    const pipeline = pipeDoc.data();
    const pipelineId = pipeDoc.id;
    const currentWave = pipeline.waves[pipeline.currentWave];

    if (!currentWave) continue;

    // Find this session in the current wave's tasks
    let taskFound = false;
    let allCompleted = true;

    for (const task of currentWave.tasks) {
      const taskSessionId = (task.sessionId || "").replace("sessions/", "");

      if (taskSessionId === sessionId && task.status === "triggered") {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
        taskFound = true;
        result.pipelineId = pipelineId;
        result.action = "PIPELINE_TASK_COMPLETED";
        result.detail = `Task "${task.title}" completed in Wave ${pipeline.currentWave + 1}`;
      }

      if (task.status !== "completed" && task.status !== "pr_merged") {
        allCompleted = false;
      }
    }

    if (!taskFound) continue;

    // Check if all tasks in this wave are done
    if (allCompleted && currentWave.status === "running") {
      currentWave.status = "merging";
      currentWave.mergeCheckStartedAt = new Date().toISOString();
      result.action = "PIPELINE_WAVE_MERGING";
      result.detail = `All tasks in Wave ${pipeline.currentWave + 1} completed. Waiting for PR merges.`;
    }

    // For waves in "merging" status — check PR merge status
    if (currentWave.status === "merging") {
      const mergeResult = await checkWavePRsMerged(currentWave, pipeline.currentWave + 1);

      if (mergeResult.allMerged) {
        // Check grace period (5 minutes for Firebase deploy)
        const mergeStarted = new Date(currentWave.mergeCheckStartedAt).getTime();
        const elapsed = Date.now() - mergeStarted;
        const GRACE_MS = 5 * 60 * 1000; // 5 minutes

        if (elapsed >= GRACE_MS) {
          // Grace period passed — advance to next wave!
          currentWave.status = "completed";
          currentWave.completedAt = new Date().toISOString();

          const nextWaveIdx = pipeline.currentWave + 1;

          if (nextWaveIdx >= pipeline.totalWaves) {
            // All waves done!
            pipeline.status = "completed";
            result.action = "PIPELINE_COMPLETED";
            result.detail = `🎉 Pipeline "${pipeline.name}" completed! All ${pipeline.totalWaves} waves finished.`;
          } else {
            // Trigger next wave
            pipeline.currentWave = nextWaveIdx;
            const nextWave = pipeline.waves[nextWaveIdx];
            nextWave.status = "running";
            nextWave.triggeredAt = new Date().toISOString();

            const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app";

            for (let i = 0; i < nextWave.tasks.length; i++) {
              const task = nextWave.tasks[i];
              try {
                const res = await fetch(`${BASE_URL}/api/jules/trigger`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: task.prompt,
                    title: task.title,
                    files: task.files,
                    fileLocks: task.fileLocks,
                    autoApprove: task.autoApprove,
                    acceptanceCriteria: task.acceptanceCriteria,
                    _pipelineId: pipelineId,
                    _waveNumber: nextWaveIdx,
                  }),
                });
                const trigResult = await res.json();
                if (trigResult.sessionId) {
                  task.sessionId = trigResult.sessionId.replace("sessions/", "");
                  task.status = "triggered";
                  task.triggeredAt = new Date().toISOString();
                }
              } catch (err) {
                task.status = "failed";
                task.error = err.message;
              }
            }

            result.action = "PIPELINE_WAVE_ADVANCED";
            result.detail = `Wave ${pipeline.currentWave} of ${pipeline.totalWaves} triggered with ${nextWave.tasks.length} task(s).`;
          }
        } else {
          result.action = "PIPELINE_WAVE_GRACE_PERIOD";
          result.detail = `PRs merged. Waiting ${Math.ceil((GRACE_MS - elapsed) / 60000)} more min for Firebase deploy.`;
        }
      } else {
        result.action = "PIPELINE_WAITING_MERGE";
        result.detail = `Waiting for ${mergeResult.unmerged} PR(s) to merge in Wave ${pipeline.currentWave + 1}.`;
      }
    }

    // Save pipeline state
    pipeline.updatedAt = new Date().toISOString();
    await pipeDoc.ref.update({
      waves: pipeline.waves,
      currentWave: pipeline.currentWave,
      status: pipeline.status,
      updatedAt: pipeline.updatedAt,
    });

    break; // Only process one pipeline per session
  }

  return result;
}

/**
 * Check if all PRs for a wave's tasks have been merged via GitHub API.
 */
async function checkWavePRsMerged(wave, waveLabel) {
  const result = { allMerged: true, unmerged: 0 };

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    // Can't check — assume merged after grace period
    return result;
  }

  for (const task of wave.tasks) {
    if (task.status === "pr_merged") continue;

    // Search for PRs with matching title
    try {
      const searchTitle = task.title.replace(/[[\]]/g, "");
      const res = await fetch(
        `https://api.github.com/search/issues?q=repo:JClouddd/Gravix+is:pr+"${encodeURIComponent(searchTitle)}"&per_page=5`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!res.ok) {
        // API error — assume not merged yet but don't block forever
        result.unmerged++;
        result.allMerged = false;
        continue;
      }

      const data = await res.json();
      const matchingPR = data.items?.find(
        (pr) => pr.pull_request?.merged_at != null
      );

      if (matchingPR) {
        task.status = "pr_merged";
      } else {
        result.unmerged++;
        result.allMerged = false;
      }
    } catch {
      // Network error — skip this check
      result.unmerged++;
      result.allMerged = false;
    }
  }

  return result;
}

/**
 * Handle a failed pipeline task — use Sentinel to diagnose and auto-fix.
 * Called from the FAILED handler when a session belongs to a pipeline.
 */
async function handlePipelineTaskFailure(sessionId, title, pipelineId) {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app";

  try {
    // Call Sentinel diagnose
    const diagRes = await fetch(`${BASE_URL}/api/sentinel/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorData: {
          message: `Jules task failed: ${title}`,
          source: "jules-pipeline",
          route: "/api/jules/pipeline",
        },
      }),
    });

    if (!diagRes.ok) return { action: "SENTINEL_UNAVAILABLE" };

    const diagnosis = await diagRes.json();

    if (diagnosis.julesCanFix && diagnosis.fixPrompt) {
      // Auto-create fix task
      const fixRes = await fetch(`${BASE_URL}/api/jules/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: diagnosis.fixPrompt,
          title: `fix: Auto-repair for "${title}"`,
          files: diagnosis.fileLocks || [],
          fileLocks: diagnosis.fileLocks || [],
          autoApprove: true,
          acceptanceCriteria: "The fix resolves the original failure.",
          _pipelineId: pipelineId,
        }),
      });

      const fixResult = await fixRes.json();
      return {
        action: "SENTINEL_FIX_TRIGGERED",
        detail: `Sentinel diagnosed and triggered fix. Session: ${fixResult.sessionId}`,
        diagnosis: diagnosis.diagnosis,
      };
    }

    // Sentinel says it can't auto-fix — pause pipeline
    const db = adminDb();
    const pipeRef = db.collection("jules_pipelines").doc(pipelineId);
    await pipeRef.update({
      status: "paused",
      updatedAt: new Date().toISOString(),
    });

    return {
      action: "PIPELINE_PAUSED",
      detail: `Sentinel cannot auto-fix. Pipeline paused. Diagnosis: ${diagnosis.diagnosis}`,
    };
  } catch (err) {
    return { action: "SENTINEL_ERROR", detail: err.message };
  }
}
