import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { errorData } = await request.json();

    if (!errorData) {
      return Response.json(
        { error: "Missing errorData in request body" },
        { status: 400 }
      );
    }

    const { message, source, route, stackTrace } = errorData;

    const prompt = `Analyze the following system error:
Source: ${source || "unknown"}
Route: ${route || "unknown"}
Message: ${message || "unknown"}
Stack Trace: ${stackTrace || "none"}`;

    const systemPrompt = `You are an expert root-cause analysis diagnostic agent.
Analyze the provided system error and return a structured JSON response diagnosing the issue.`;

    const jsonSchema = {
      type: "object",
      properties: {
        diagnosis: { type: "string" },
        severity: { type: "string" },
        julesCanFix: { type: "boolean" },
        fixPrompt: { type: "string", nullable: true },
        fileLocks: { type: "array", items: { type: "string" } },
      },
      required: ["diagnosis", "severity", "julesCanFix", "fileLocks"],
    };

    const diagnosisResult = await generate({
      prompt,
      systemPrompt,
      complexity: "quick",
      jsonSchema,
    });

    let structuredData;
    try {
      structuredData = JSON.parse(diagnosisResult.text);
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response as JSON: ${diagnosisResult.text}`);
    }

    return Response.json(structuredData);
  } catch (error) {
    logRouteError("runtime", "Sentinel Diagnose: Failed to process diagnostic", error, "/api/sentinel/diagnose");
    return Response.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
