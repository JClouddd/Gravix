import { structuredGenerate, generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";

/**
 * POST /api/agents/route
 * Conductor agent — receives a natural language request and routes it
 * to the appropriate specialist agent, then optionally executes it.
 *
 * Body: { message: string, context?: object, execute?: boolean }
 * Returns: { routing, response? }
 */
export async function POST(request) {
  try {
    const { message, context = {}, execute = false } = await request.json();

    if (!message) {
      return Response.json(
        { error: "message required" },
        { status: 400 }
      );
    }

    // Use structured output for reliable routing decisions
    const routingSchema = {
      type: "object",
      properties: {
        agent: {
          type: "string",
          enum: ["conductor", "forge", "scholar", "analyst", "courier", "sentinel", "builder"],
        },
        reasoning: { type: "string" },
        action: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["agent", "reasoning", "action", "confidence"],
    };

    const routingResult = await structuredGenerate({
      prompt: `Analyze this user request and decide which specialist agent should handle it.

User request: "${message}"
Context: ${JSON.stringify(context)}

Available agents:
1. FORGE — DevOps, infrastructure, secrets, IAM, health checks
2. SCHOLAR — Research, knowledge retrieval, documentation, learning
3. ANALYST — Data analysis, cost reports, metrics, notebooks
4. COURIER — Email, calendar, tasks, communications, meetings
5. SENTINEL — Security monitoring, cost tracking, anomalies, rules
6. BUILDER — Code generation, deployments, CI/CD, project scaffolding

Choose the best agent and explain your reasoning.`,
      schema: routingSchema,
      systemPrompt: "You are Conductor, the orchestrator for Gravix. Route requests intelligently.",
      complexity: "flash",
    });

    let decision;
    try {
      decision = JSON.parse(routingResult.text);
    } catch {
      decision = {
        agent: "scholar",
        reasoning: "Could not parse routing decision, defaulting to Scholar",
        action: message,
        confidence: 0.5,
      };
    }

    // Log routing cost
    try {
      await logUsage({
        route: "/api/agents/route",
        model: routingResult.model,
        modelTier: routingResult.modelTier,
        inputTokens: routingResult.tokens.input,
        outputTokens: routingResult.tokens.output,
        totalTokens: routingResult.tokens.total,
        cost: routingResult.cost.totalCost,
        agent: "conductor",
      });
    } catch (err) {
      console.warn("[costTracker] Failed to log:", err.message);
    }

    // If execute flag is set and confidence is high, run the agent
    let agentResponse = null;
    if (execute && decision.confidence >= 0.6) {
      const agentResult = await generate({
        prompt: message,
        systemPrompt: `You are ${decision.agent}, a specialist agent in Gravix. ${decision.action}`,
        complexity: decision.agent === "scholar" ? "pro" : "flash",
        grounded: decision.agent === "scholar" || decision.agent === "sentinel",
      });

      agentResponse = {
        text: agentResult.text,
        model: agentResult.model,
        tokens: agentResult.tokens,
        cost: agentResult.cost,
        duration: agentResult.duration,
        grounded: agentResult.grounded,
      };

      // Log agent execution cost
      try {
        await logUsage({
          route: `/api/agents/${decision.agent}`,
          model: agentResult.model,
          modelTier: agentResult.modelTier,
          inputTokens: agentResult.tokens.input,
          outputTokens: agentResult.tokens.output,
          totalTokens: agentResult.tokens.total,
          cost: agentResult.cost.totalCost,
          agent: decision.agent,
        });
      } catch (err) {
        console.warn("[costTracker] Failed to log:", err.message);
      }
    }

    return Response.json({
      routing: decision,
      response: agentResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/agents/route]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
