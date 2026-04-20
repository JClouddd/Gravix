import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

const DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    diagnosis: {
      type: "string",
      description: "A clear explanation of what went wrong based on the error data",
    },
    suggestion: {
      type: "string",
      description: "A short, actionable suggestion for how to fix the issue",
    },
    confidence: {
      type: "number",
      description: "Confidence level in the diagnosis from 0 to 100",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description: "A list of steps to resolve the issue",
    },
    julesCanFix: {
      type: "boolean",
      description: "Whether this issue is likely fixable by the Jules coding agent",
    },
    fixPrompt: {
      type: "string",
      description: "A complete Jules task prompt that would instruct it to fix this error",
    },
    fileLocks: {
      type: "array",
      items: { type: "string" },
      description: "A list of file paths that the fix would likely modify",
    },
  },
  required: ["diagnosis", "suggestion", "confidence", "steps", "julesCanFix", "fixPrompt", "fileLocks"],
};

export async function POST(request) {
  try {
    const body = await request.json();
    let errorData = body.errorData;

    if (body.errorId) {
      const doc = await adminDb.collection("system_errors").doc(body.errorId).get();
      if (!doc.exists) {
        return Response.json({ error: "Error document not found" }, { status: 404 });
      }
      errorData = doc.data();
    }

    if (!errorData || !errorData.message) {
      return Response.json({ error: "Missing errorData or errorId" }, { status: 400 });
    }

    // Attempt to find related recent errors (same source, last 24h)
    let relatedErrors = [];
    if (errorData.source) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentDocs = await adminDb.collection("system_errors")
        .where("source", "==", errorData.source)
        .where("createdAt", ">=", yesterday)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      relatedErrors = recentDocs.docs
        .filter(d => d.id !== body.errorId)
        .map(d => ({
          message: d.data().message,
          createdAt: d.data().createdAt,
        }));
    }

    const prompt = `Analyze the following system error and provide a structured diagnosis and fix plan.

Error Message: ${errorData.message || "Unknown"}
Source: ${errorData.source || "Unknown"}
Route: ${errorData.context?.route || errorData.route || "Unknown"}
Stack Trace: ${errorData.context?.stack || errorData.stack || "Unknown"}
Timestamp: ${errorData.createdAt || errorData.timestamp || new Date().toISOString()}

Recent related errors from the same source:
${JSON.stringify(relatedErrors, null, 2)}
`;

    const rawResponse = await generate({
      prompt,
      systemPrompt: "You are an expert system diagnostician and software engineer. You analyze application errors, determine root causes, and propose actionable fixes. You must return your response as a valid JSON object matching the requested schema.",
      jsonSchema: DIAGNOSIS_SCHEMA,
      maxTokens: 2000,
    });

    // Parse the JSON string from Gemini
    const diagnosisResult = JSON.parse(rawResponse.text);

    return Response.json(diagnosisResult);

  } catch (err) {
    await logRouteError("runtime", "Sentinel Diagnose Failed", err, "/api/sentinel/diagnose");
    return Response.json({ error: "Diagnosis failed", details: err.message }, { status: 500 });
  }
}
