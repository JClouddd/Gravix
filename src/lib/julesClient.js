/**
 * julesClient.js — Jules API Client (v1alpha)
 *
 * Full state machine support:
 *   QUEUED → PLANNING → WAITING_FOR_PLAN_APPROVAL → IN_PROGRESS → COMPLETED
 *                    ↘ WAITING_FOR_USER_FEEDBACK ↗
 *                    ↘ PAUSED ↗
 *                    ↘ FAILED
 *
 * Endpoints:
 *   - List sources (repos)
 *   - Create/get/list sessions
 *   - Approve plans
 *   - Send messages (for user feedback)
 *   - List activities (for monitoring)
 *
 * API Key stored in Secret Manager: jules-api-key
 */

const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";

/* ── Get API Key ──────────────────────────────────────────────── */
function getApiKey() {
  const key = process.env.JULES_API_KEY;
  if (!key) {
    throw new Error("JULES_API_KEY environment variable is not set");
  }
  return key;
}

/* ── Generic Fetch Helper ─────────────────────────────────────── */
async function julesRequest(path, method = "GET", body = null) {
  const headers = {
    "X-Goog-Api-Key": getApiKey(),
    "Content-Type": "application/json",
  };

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${JULES_API_BASE}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jules API ${method} ${path} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/* ── List Sources (connected repos) ───────────────────────────── */
export async function listSources() {
  return julesRequest("/sources");
}

/* ── Create Session (trigger a task) ──────────────────────────── */
export async function createSession({
  prompt,
  title = "",
  repo = "JClouddd/Gravix",
  branch = "main",
  requirePlanApproval = true,
  automationMode = "AUTO_CREATE_PR",
}) {
  const body = {
    prompt,
    ...(title && { title }),
    sourceContext: {
      source: `sources/github/${repo}`,
      githubRepoContext: {
        startingBranch: branch,
      },
    },
    requirePlanApproval,
    automationMode,
  };

  return julesRequest("/sessions", "POST", body);
}

/* ── Get Session Status ───────────────────────────────────────── */
export async function getSession(sessionId) {
  return julesRequest(`/sessions/${sessionId}`);
}

/* ── List Sessions ────────────────────────────────────────────── */
export async function listSessions() {
  return julesRequest("/sessions");
}

/* ── Approve Plan (dedicated endpoint) ────────────────────────── */
export async function approvePlan(sessionId) {
  return julesRequest(`/sessions/${sessionId}:approvePlan`, "POST", {});
}

/* ── Send Message (for user feedback / unblocking) ────────────── */
export async function sendMessage(sessionId, message) {
  // Correct endpoint: :sendMessage with { prompt } field (NOT "message")
  return julesRequest(`/sessions/${sessionId}:sendMessage`, "POST", {
    prompt: message,
  });
}

/* ── Cancel / Delete Session ──────────────────────────────────── */
export async function cancelSession(sessionId) {
  return julesRequest(`/sessions/${sessionId}`, "DELETE");
}

/* ── List Activities (monitor session progress) ───────────────── */
export async function listActivities(sessionId) {
  return julesRequest(`/sessions/${sessionId}/activities`);
}

/* ── Send Activity (approve plan, send message — legacy compat) ── */
export async function sendActivity(sessionId, { type = "message", content = "" }) {
  if (type === "approve") {
    return approvePlan(sessionId);
  } else if (type === "reject") {
    return julesRequest(`/sessions/${sessionId}/activities`, "POST", {
      rejectPlan: { reason: content },
    });
  } else {
    return sendMessage(sessionId, content);
  }
}

/* ── Convenience: Fire-and-Forget Task ────────────────────────── */
export async function triggerTask({
  prompt,
  title,
  repo = "JClouddd/Gravix",
  autoApprove = false,
}) {
  const session = await createSession({
    prompt,
    title,
    repo,
    requirePlanApproval: !autoApprove,
    automationMode: "AUTO_CREATE_PR",
  });

  return {
    sessionId: session.name || session.id,
    status: session.state || "CREATED",
    message: autoApprove
      ? "Task created and will auto-approve. Jules will create a PR when done."
      : "Task created. Approve the plan at jules.google.com or via the API.",
    session,
  };
}

const defaultExport = {
  listSources,
  createSession,
  getSession,
  listSessions,
  approvePlan,
  sendMessage,
  cancelSession,
  listActivities,
  sendActivity,
  triggerTask,
};
export default defaultExport;
