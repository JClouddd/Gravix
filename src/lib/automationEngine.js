/**
 * src/lib/automationEngine.js
 * Cross-module automation engine for Gravix
 */

// Placeholder handlers

async function classifyEmail(data, context) {
  return { action: "classifyEmail", result: "Classification triggered" };
}

async function linkToClient(data, context) {
  return { action: "linkToClient", result: "Linkage verified" };
}

async function createTaskIfNeeded(data, context) {
  return { action: "createTaskIfNeeded", result: "Task creation evaluated" };
}

async function logIfInvoice(data, context) {
  return { action: "logIfInvoice", result: "Invoice logging checked" };
}

async function processTranscript(data, context) {
  return { action: "processTranscript", result: "Transcript processed" };
}

async function extractActions(data, context) {
  return { action: "extractActions", result: "Actions extracted" };
}

async function createFollowups(data, context) {
  return { action: "createFollowups", result: "Followups created" };
}

async function generatePlan(data, context) {
  return { action: "generatePlan", result: "Plan generated" };
}

async function scheduleKickoff(data, context) {
  return { action: "scheduleKickoff", result: "Kickoff scheduled" };
}

async function draftWelcome(data, context) {
  return { action: "draftWelcome", result: "Welcome message drafted" };
}

async function sendAlert(data, context) {
  return { action: "sendAlert", result: "Alert sent" };
}

async function logError(data, context) {
  return { action: "logError", result: "Error logged" };
}

export const pipelineRegistry = {
  "email.received": [classifyEmail, linkToClient, createTaskIfNeeded, logIfInvoice],
  "meeting.ended": [processTranscript, extractActions, createFollowups],
  "client.created": [generatePlan, scheduleKickoff, draftWelcome],
  "cost.threshold": [sendAlert],
  "agent.error": [logError, sendAlert],
};

export async function triggerPipeline(event, data) {
  const handlers = pipelineRegistry[event];
  if (!handlers) {
    throw new Error(`Event '${event}' not found in pipeline registry.`);
  }

  const results = [];
  for (const handler of handlers) {
    try {
      const result = await handler(data, { event });
      results.push(result);
    } catch (err) {
      console.error(`Error in pipeline handler for ${event}:`, err);
      results.push({ action: handler.name, error: err.message });
    }
  }

  console.log(`Pipeline run for event: ${event}`, { results });
  return results;
}
