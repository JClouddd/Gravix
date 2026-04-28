import { structuredGenerate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/deerflow/evaluate
 * Deerflow AI Middleware for evaluating agent actions before execution.
 * Enforces a strict cognitive chain of thought to prevent hallucinations.
 */

const deerflowSchema = {
  type: "object",
  properties: {
    context: {
      type: "string",
      description: "Step 1: Evaluate the payload, file locks, and project constraints.",
    },
    hypothesis: {
      type: "string",
      description: "Step 2: Generate a hypothesis of what code changes need to be made.",
    },
    verification: {
      type: "string",
      description: "Step 3: Play devil's advocate (Critic). What could go wrong with this hypothesis? Are dependencies missing? Will it break the build?",
    },
    revisedPlan: {
      type: "string",
      description: "Step 4: The final, verified plan after correcting for any issues found in verification.",
    },
    status: {
      type: "string",
      enum: ["VERIFIED", "REJECTED"],
      description: "Final evaluation status. VERIFIED means Jules can proceed. REJECTED means Jules must halt.",
    },
    requiredFileLocks: {
      type: "array",
      items: { type: "string" },
      description: "The complete list of file paths that must be modified to execute the revised plan.",
    }
  },
  required: ["context", "hypothesis", "verification", "revisedPlan", "status", "requiredFileLocks"]
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, filesTargeted = [] } = body;

    if (!prompt) {
      return Response.json({ error: "Prompt payload required for Deerflow evaluation" }, { status: 400 });
    }

    const systemPrompt = `You are Deerflow, the cognitive safety middleware for the Gravix Omni-Hub.
Your job is to intercept commands intended for the 'Jules' code execution agent and evaluate them.
You must use sequential thinking: Context -> Hypothesis -> Verification (Critic) -> Revised Plan.
If the prompt requires code changes, verify that the requested changes are safe, that all necessary files are locked, and that dependencies exist.
Output STRICTLY matching the JSON schema provided.`;

    const evaluationPrompt = `Evaluate the following Jules task payload:
Payload Prompt: ${prompt}
Currently Targeted Files: ${JSON.stringify(filesTargeted)}`;

    const result = await structuredGenerate({
      prompt: evaluationPrompt,
      schema: deerflowSchema,
      systemPrompt,
      complexity: "pro" // Use Pro for deep reasoning
    });

    const parsedEvaluation = JSON.parse(result.text);

    return Response.json({
      success: true,
      evaluation: parsedEvaluation,
      tokenUsage: result.tokens,
      estimatedCost: result.cost
    });

  } catch (error) {
    console.error("[/api/deerflow/evaluate POST]", error);
    logRouteError("deerflow", "/api/deerflow/evaluate error", error, "/api/deerflow/evaluate");
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
