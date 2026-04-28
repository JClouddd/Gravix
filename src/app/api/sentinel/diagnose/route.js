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

    // Auto-Remediation Logic: If Jules can fix it, autonomously trigger Jules
    if (structuredData.julesCanFix && structuredData.fixPrompt) {
      try {
        console.log(`[Sentinel] Initiating Auto-Remediation via Jules for: ${message}`);
        // Cannot use relative URLs in fetch from server side unless domain is known.
        // We will just invoke the Jules API route function directly or use a full URL if configured.
        // For Next.js App Router, it's better to fetch to localhost if we know the port,
        // or just construct the absolute URL. We'll try fetching to the deployed app URL if available,
        // otherwise localhost.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        fetch(`${baseUrl}/api/jules/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Fix the following error autonomously:\n\nError: ${message}\nDiagnosis: ${structuredData.diagnosis}\n\nTask: ${structuredData.fixPrompt}`,
            title: `fix(auto-remediation): Sentinel detected and resolving ${route || "system"} error`,
            files: structuredData.fileLocks || [],
            fileLocks: structuredData.fileLocks || [],
            autoApprove: true,
            acceptanceCriteria: "The error is resolved and the application builds successfully without regressions."
          })
        }).catch(e => console.error("Failed to trigger Jules auto-remediation asynchronously:", e));
        
        structuredData.autoRemediationTriggered = true;
      } catch (err) {
        console.warn("[Sentinel] Failed to trigger auto-remediation:", err);
        structuredData.autoRemediationTriggered = false;
      }
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
