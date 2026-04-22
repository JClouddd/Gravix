/**
 * Error Logger Utility
 * Central nervous system for error logging across all Gravix integrations.
 * Streams directly to GCP Cloud Error Reporting natively.
 */

import { sendDevOpsAlert } from "@/lib/telegramClient";

const ERROR_SOURCES = [
  "firebase_deploy", "firebase_auth", "firestore",
  "cloud_functions", "github_ci", "jules",
  "gmail", "calendar", "tasks", "meet",
  "youtube", "gemini", "discovery", "colab",
  "runtime", "agent"
];

/**
 * Log an error to GCP Cloud Error Reporting natively.
 * Fire-and-forget — never throws, never blocks the calling route.
 *
 * @param {string} source - One of the ERROR_SOURCES
 * @param {string} severity - "error" | "warning" | "info"
 * @param {string} title - Short description
 * @param {string} message - Full error message
 * @param {object} context - Additional context (route, statusCode, etc.)
 */
export async function logError(source, severity, title, message, context = {}) {
  try {
    const errorPayload = {
      "@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
      message: `${title}: ${message}\n${context.stack || ''}`,
      context: {
        reportLocation: context.route ? { filePath: context.route } : undefined,
        httpRequest: context.route ? { url: context.route } : undefined,
        ...context
      },
      source: ERROR_SOURCES.includes(source) ? source : "runtime",
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(errorPayload);

    if (severity === "info") {
      console.info(payloadString);
    } else if (severity === "warning") {
      console.warn(payloadString);
    } else {
      console.error(payloadString);
    }
  } catch (err) {
    // Last resort — log to console, never crash the caller
    console.error("[ErrorLogger] Failed to persist error:", err.message);
  }
}

/**
 * Log an error from an API route's catch block.
 * Convenience wrapper with route context auto-populated.
 *
 * @param {string} source - Error source key
 * @param {string} title - Short description
 * @param {Error} error - The caught error object
 * @param {string} route - The API route path (e.g., "/api/email/inbox")
 */
export async function logRouteError(source, title, error, route) {
  const errorMessage = error?.message || String(error);

  // Fire and forget Telegram devops alert
  const alertText = `🚨 <b>Error Alert</b>\n<b>Source:</b> ${source}\n<b>Route:</b> ${route}\n<b>Title:</b> ${title}\n<b>Message:</b> ${errorMessage}`;
  sendDevOpsAlert(alertText).catch((err) => {
    console.error("[ErrorLogger] Failed to send Telegram alert:", err);
  });

  return logError(source, "error", title, errorMessage, {
    route,
    stack: error?.stack,
  });
}

export { ERROR_SOURCES };
