/**
 * src/lib/automationEngine.js
 * Cross-module automation engine for Gravix
 *
 * Each handler receives (data, context) and returns a result object.
 * Handlers call real APIs — Gemini for classification, Firestore for storage,
 * Google Tasks for task creation, FCM for notifications.
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { refreshAccessToken } from "@/lib/googleAuth";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get a valid OAuth access token, refreshing if expired.
 * Returns null if no tokens are stored.
 */
async function getAccessToken() {
  const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
  if (!tokensDoc.exists) return null;

  const tokens = tokensDoc.data();
  let accessToken = tokens.accessToken;

  if (Date.now() > tokens.expiresAt) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;
      await adminDb.collection("settings").doc("google_oauth").update({
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    } catch {
      return null;
    }
  }
  return accessToken;
}

// ─── Email Pipeline Handlers ────────────────────────────────────────────────

/**
 * Classify a single email using Gemini.
 * Expects data.email with { id, from, subject, snippet }.
 */
async function classifyEmail(data, context) {
  const email = data.email || data;
  if (!email.subject && !email.snippet) {
    return { action: "classifyEmail", result: "skipped", reason: "no content" };
  }

  try {
    const result = await generate({
      prompt: `Classify this email into exactly ONE category and urgency level.

Categories: client, invoice, task-request, newsletter, notification, personal
Urgency: low, medium, high

Email:
From: ${email.from || "unknown"}
Subject: ${email.subject || ""}
Snippet: ${email.snippet || ""}

Respond in this exact format (one line each):
CATEGORY: <category>
URGENCY: <urgency>
REASON: <one sentence reason>`,
      complexity: "flash",
    });

    const text = result.text || "";
    const categoryMatch = text.match(/CATEGORY:\s*(\S+)/i);
    const urgencyMatch = text.match(/URGENCY:\s*(\S+)/i);
    const reasonMatch = text.match(/REASON:\s*(.+)/i);

    const classification = {
      category: categoryMatch ? categoryMatch[1].toLowerCase() : "notification",
      urgency: urgencyMatch ? urgencyMatch[1].toLowerCase() : "low",
      reason: reasonMatch ? reasonMatch[1].trim() : "Auto-classified",
    };

    return { action: "classifyEmail", result: classification, emailId: email.id };
  } catch (err) {
    return { action: "classifyEmail", error: err.message, emailId: email.id };
  }
}

/**
 * Match the email sender against existing clients in Firestore.
 * Links by sender domain → client domain.
 */
async function linkToClient(data, context) {
  const email = data.email || data;
  const from = email.from || "";

  // Extract domain out of Name <email@domain.com> format
  const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
  if (!domainMatch) {
    return { action: "linkToClient", result: "skipped", reason: "no domain in sender" };
  }

  const senderDomain = domainMatch[1].toLowerCase();

  // Skip common free email providers
  const freeProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
  if (freeProviders.includes(senderDomain)) {
    return { action: "linkToClient", result: "skipped", reason: "free email provider" };
  }

  try {
    // Search clients collection for matching domain
    const clientsSnapshot = await adminDb.collection("clients")
      .where("domain", "==", senderDomain)
      .limit(1)
      .get();

    if (clientsSnapshot.empty) {
      return { action: "linkToClient", result: "no-match", domain: senderDomain };
    }

    const client = clientsSnapshot.docs[0];
    // Log the linkage
    await adminDb.collection("client_emails").add({
      emailId: email.id,
      from,
      clientId: client.id,
      clientName: client.data().name || senderDomain,
      timestamp: new Date().toISOString(),
    });

    return {
      action: "linkToClient",
      result: "linked",
      clientId: client.id,
      clientName: client.data().name,
    };
  } catch (err) {
    return { action: "linkToClient", error: err.message };
  }
}

/**
 * If the email is classified as a task-request or high urgency,
 * create a Google Task.
 */
async function createTaskIfNeeded(data, context) {
  const email = data.email || data;
  const classification = data.classification || context.classification || {};

  const isTaskWorthy =
    classification.category === "task-request" ||
    classification.urgency === "high";

  if (!isTaskWorthy) {
    return { action: "createTaskIfNeeded", result: "skipped", reason: "not task-worthy" };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { action: "createTaskIfNeeded", result: "skipped", reason: "no OAuth token" };
  }

  try {
    const res = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `[Email] ${email.subject || "No subject"}`,
        notes: `From: ${email.from || "unknown"}\nSnippet: ${email.snippet || ""}\n\nSource: email-automation`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { action: "createTaskIfNeeded", error: `Tasks API: ${errText}` };
    }

    const task = await res.json();

    // Log for activity feed
    await adminDb.collection("automation_events").add({
      type: "task_created",
      source: "email",
      emailId: email.id,
      taskId: task.id,
      title: email.subject,
      timestamp: new Date().toISOString(),
    });

    return { action: "createTaskIfNeeded", result: "created", taskId: task.id };
  } catch (err) {
    return { action: "createTaskIfNeeded", error: err.message };
  }
}

/**
 * If the email looks like an invoice, log it to income_entries.
 */
async function logIfInvoice(data, context) {
  const email = data.email || data;
  const classification = data.classification || context.classification || {};

  const subject = (email.subject || "").toLowerCase();
  const isInvoice =
    classification.category === "invoice" ||
    subject.includes("invoice") ||
    subject.includes("receipt") ||
    subject.includes("payment");

  if (!isInvoice) {
    return { action: "logIfInvoice", result: "skipped", reason: "not an invoice" };
  }

  try {
    await adminDb.collection("income_entries").add({
      from: email.from || "unknown",
      subject: email.subject || "",
      emailId: email.id,
      timestamp: new Date().toISOString(),
      source: "email-auto",
      status: "pending-review",
    });

    return { action: "logIfInvoice", result: "logged" };
  } catch (err) {
    return { action: "logIfInvoice", error: err.message };
  }
}

// ─── Meeting Pipeline Handlers ──────────────────────────────────────────────

async function processTranscript(data, context) {
  const { transcriptText, meetingTitle } = data;
  if (!transcriptText) {
    return { action: "processTranscript", result: "skipped", reason: "no transcript" };
  }

  try {
    // Store in knowledge items for future reference
    await adminDb.collection("knowledge_items").add({
      title: `Meeting: ${meetingTitle || "Untitled"}`,
      content: transcriptText.substring(0, 10000), // limit storage
      type: "meeting-transcript",
      timestamp: new Date().toISOString(),
      source: "meeting-auto",
    });

    return { action: "processTranscript", result: "stored" };
  } catch (err) {
    return { action: "processTranscript", error: err.message };
  }
}

async function extractActions(data, context) {
  const { transcriptText } = data;
  if (!transcriptText) {
    return { action: "extractActions", result: "skipped", reason: "no transcript" };
  }

  try {
    const result = await generate({
      prompt: `Extract action items from this meeting transcript. For each action item, provide:
- TASK: description
- ASSIGNEE: who (or "unassigned")
- DEADLINE: when (or "none")

Transcript:
${transcriptText.substring(0, 5000)}

List each action item on its own line.`,
      complexity: "flash",
    });

    // Parse the actions from the response
    const lines = (result.text || "").split("\n").filter(l => l.includes("TASK:"));
    const actions = lines.map(line => {
      const taskMatch = line.match(/TASK:\s*(.+)/i);
      return { task: taskMatch ? taskMatch[1].trim() : line.trim() };
    });

    return { action: "extractActions", result: actions, count: actions.length };
  } catch (err) {
    return { action: "extractActions", error: err.message };
  }
}

async function createFollowups(data, context) {
  const actions = context.extractedActions || data.actions || [];
  if (actions.length === 0) {
    return { action: "createFollowups", result: "skipped", reason: "no actions to follow up" };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { action: "createFollowups", result: "skipped", reason: "no OAuth token" };
  }

  let created = 0;
  for (const item of actions.slice(0, 10)) { // cap at 10
    try {
      await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `[Meeting] ${item.task || item}`,
          notes: `Source: meeting-automation\nMeeting: ${data.meetingTitle || "Untitled"}`,
        }),
      });
      created++;
    } catch {
      // continue with remaining tasks
    }
  }

  return { action: "createFollowups", result: "created", count: created };
}

// ─── Client Onboarding Pipeline Handlers ────────────────────────────────────

async function generatePlan(data, context) {
  const { clientName, projectType, notes } = data;
  if (!clientName) {
    return { action: "generatePlan", result: "skipped", reason: "no client name" };
  }

  try {
    const result = await generate({
      prompt: `Create a 30-day onboarding plan for a new client.

Client: ${clientName}
Project type: ${projectType || "General"}
Notes: ${notes || "None"}

Format as a numbered list of milestones with target dates (Day 1, Day 3, Day 7, etc.).`,
      complexity: "flash",
    });

    // Store the plan
    await adminDb.collection("automation_events").add({
      type: "onboarding_plan",
      clientName,
      plan: result.text,
      timestamp: new Date().toISOString(),
    });

    return { action: "generatePlan", result: "generated", planLength: result.text.length };
  } catch (err) {
    return { action: "generatePlan", error: err.message };
  }
}

async function scheduleKickoff(data, context) {
  const { clientName } = data;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { action: "scheduleKickoff", result: "skipped", reason: "no OAuth token" };
  }

  try {
    // Schedule kickoff 3 days from now
    const start = new Date();
    start.setDate(start.getDate() + 3);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Kickoff: ${clientName || "New Client"}`,
          description: "Auto-scheduled by Gravix client onboarding pipeline.",
          start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
          end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { action: "scheduleKickoff", error: `Calendar API: ${errText}` };
    }

    const event = await res.json();
    return { action: "scheduleKickoff", result: "scheduled", eventId: event.id };
  } catch (err) {
    return { action: "scheduleKickoff", error: err.message };
  }
}

async function draftWelcome(data, context) {
  const { clientName, clientEmail } = data;
  if (!clientName) {
    return { action: "draftWelcome", result: "skipped", reason: "no client name" };
  }

  try {
    const result = await generate({
      prompt: `Draft a short, professional welcome email for a new client.

Client name: ${clientName}
Include: thanks for choosing us, what they can expect in the first week, a mention of the upcoming kickoff meeting.
Keep it under 150 words. Friendly but professional tone.`,
      complexity: "flash",
    });

    // Store as a draft in automation events
    await adminDb.collection("automation_events").add({
      type: "welcome_draft",
      clientName,
      clientEmail: clientEmail || null,
      draft: result.text,
      status: "pending-review",
      timestamp: new Date().toISOString(),
    });

    return { action: "draftWelcome", result: "drafted", to: clientEmail || "pending" };
  } catch (err) {
    return { action: "draftWelcome", error: err.message };
  }
}

// ─── Alert Pipeline Handlers ────────────────────────────────────────────────

/**
 * Send an alert via the notification system + log to Firestore.
 */
async function sendAlert(data, context) {
  const title = data.title || `Alert: ${context.event || "System"}`;
  const body = data.body || data.message || JSON.stringify(data).substring(0, 200);
  const type = data.type || (context.event === "agent.error" ? "error" : "warning");

  try {
    // Write to notifications collection directly (skip FCM if not configured)
    await adminDb.collection("notifications").add({
      title,
      body,
      type,
      source: context.event || "automation",
      read: false,
      timestamp: new Date(),
      data: data || {},
    });

    return { action: "sendAlert", result: "sent", title };
  } catch (err) {
    return { action: "sendAlert", error: err.message };
  }
}

/**
 * Log errors to automation_events for debugging and audit trail.
 */
async function logError(data, context) {
  try {
    await adminDb.collection("automation_events").add({
      type: "error",
      event: context.event || "unknown",
      error: data.error || data.message || "Unknown error",
      details: data,
      timestamp: new Date().toISOString(),
    });

    return { action: "logError", result: "logged" };
  } catch (err) {
    return { action: "logError", error: err.message };
  }
}

// ─── Pipeline Registry ──────────────────────────────────────────────────────

export const pipelineRegistry = {
  "email.received": [classifyEmail, linkToClient, createTaskIfNeeded, logIfInvoice],
  "meeting.ended": [processTranscript, extractActions, createFollowups],
  "client.created": [generatePlan, scheduleKickoff, draftWelcome],
  "cost.threshold": [sendAlert],
  "agent.error": [logError, sendAlert],
};

/**
 * Trigger a pipeline by event name.
 * Runs handlers sequentially, passing results through context for chaining.
 */
export async function triggerPipeline(event, data) {
  const handlers = pipelineRegistry[event];
  if (!handlers) {
    throw new Error(`Event '${event}' not found in pipeline registry.`);
  }

  const results = [];
  const context = { event };

  for (const handler of handlers) {
    try {
      const result = await handler(data, context);
      results.push(result);

      // Chain classification results forward for downstream handlers
      if (result.action === "classifyEmail" && result.result && typeof result.result === "object") {
        context.classification = result.result;
        data.classification = result.result;
      }
      if (result.action === "extractActions" && result.result) {
        context.extractedActions = result.result;
      }
    } catch (err) {
      console.error(`Error in pipeline handler for ${event}:`, err);
      results.push({ action: handler.name, error: err.message });
    }
  }

  // Log the pipeline run
  try {
    await adminDb.collection("automation_events").add({
      type: "pipeline_run",
      event,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Don't fail the pipeline if logging fails
  }

  console.log(`Pipeline run for event: ${event}`, { results });
  return results;
}
