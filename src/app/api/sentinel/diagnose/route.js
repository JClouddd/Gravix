import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(req) {
  try {
    const body = await req.json();
    let errorData = body.errorData;

    if (body.errorId) {
      const doc = await adminDb.collection("system_errors").doc(body.errorId).get();
      if (!doc.exists) {
        return Response.json({ error: "Error document not found" }, { status: 404 });
      }
      errorData = doc.data();
    } else if (!errorData) {
      return Response.json({ error: "Must provide errorId or errorData" }, { status: 400 });
    }

    const { message, source, stack, route, timestamp } = errorData;

    // Fetch related errors (same source, last 24h)
    let relatedErrors = [];
    if (source) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const querySnapshot = await adminDb
        .collection("system_errors")
        .where("source", "==", source)
        .where("createdAt", ">=", yesterday.toISOString())
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      querySnapshot.forEach(doc => {
        if (doc.id !== body.errorId) {
            relatedErrors.push(doc.data().message);
        }
      });
    }

    const prompt = `
      Diagnose the following system error:

      Message: ${message || "N/A"}
      Source: ${source || "N/A"}
      Route: ${route || "N/A"}
      Timestamp: ${timestamp || "N/A"}
      Stack Trace: ${stack || "N/A"}

      Related Recent Errors:
      ${relatedErrors.length > 0 ? relatedErrors.join("\n") : "None found."}
    `;

    const systemPrompt = "You are an expert system diagnostician. Analyze the error and provide a structured JSON response.";

    const schema = {
        type: "object",
        properties: {
            diagnosis: { type: "string" },
            suggestion: { type: "string" },
            confidence: { type: "number" },
            steps: { type: "array", items: { type: "string" } },
            julesCanFix: { type: "boolean" },
            fixPrompt: { type: "string" },
            fileLocks: { type: "array", items: { type: "string" } }
        },
        required: ["diagnosis", "suggestion", "confidence", "steps", "julesCanFix", "fixPrompt", "fileLocks"]
    };

    const response = await generate({
      prompt,
      systemPrompt,
      complexity: "pro",
      jsonSchema: schema
    });

    let diagnosisJson;
    try {
        diagnosisJson = JSON.parse(response.text);
    } catch(e) {
        // Fallback or retry parsing
        diagnosisJson = {
            diagnosis: "Failed to parse Gemini output as JSON",
            suggestion: "Check Gemini output manually.",
            confidence: 0,
            steps: [],
            julesCanFix: false,
            fixPrompt: "",
            fileLocks: []
        };
    }

    return Response.json(diagnosisJson);
  } catch (error) {
    await logRouteError("sentinel", "Diagnose POST failed", error, "/api/sentinel/diagnose");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
