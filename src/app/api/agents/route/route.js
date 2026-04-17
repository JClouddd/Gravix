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
        toolData: {},
      };

      // Real tool execution based on the agent
      const origin = new URL(request.url).origin;

      if (decision.agent === "forge") {
        try {
          const statusRes = await fetch(`${origin}/api/knowledge/status`);
          if (statusRes.ok) agentResponse.toolData.systemStatus = await statusRes.json();
        } catch (e) {
          console.warn("[agents/route] forge status fetch failed:", e.message);
        }
        try {
          const costsRes = await fetch(`${origin}/api/costs/summary`);
          if (costsRes.ok) agentResponse.toolData.costs = await costsRes.json();
        } catch (e) {
          console.warn("[agents/route] forge costs fetch failed:", e.message);
        }
      } else if (decision.agent === "scholar") {
        try {
          const queryRes = await fetch(`${origin}/api/knowledge/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message }),
          });
          if (queryRes.ok) {
            agentResponse.toolData.groundedResults = await queryRes.json();
          }
        } catch (e) {
          console.warn("[agents/route] scholar query fetch failed:", e.message);
        }
      } else if (decision.agent === "analyst") {
        const lowerMsg = message.toLowerCase();
        if (
          lowerMsg.includes("stock") ||
          lowerMsg.includes("ticker") ||
          lowerMsg.includes("analysis")
        ) {
          try {
            const colabRes = await fetch(`${origin}/api/colab/execute`);
            if (colabRes.ok) {
              const data = await colabRes.json();
              agentResponse.toolData.notebooks = data.notebooks;
            }
          } catch (e) {
             console.warn("[agents/route] analyst colab fetch failed:", e.message);
          }
        }
      } else if (decision.agent === "courier") {
        const lowerMsg = message.toLowerCase();
        if (
          lowerMsg.includes("email") ||
          lowerMsg.includes("draft") ||
          lowerMsg.includes("send")
        ) {
          try {
            const emailRes = await fetch(`${origin}/api/email/inbox`);
            if (emailRes.ok) {
              agentResponse.toolData.emailStatus = await emailRes.json();
            }
          } catch (e) {
            console.warn("[agents/route] courier email fetch failed:", e.message);
          }
        }
      } else if (decision.agent === "builder") {
        const lowerMsg = message.toLowerCase();
        if (
          lowerMsg.includes("code") ||
          lowerMsg.includes("pr") ||
          lowerMsg.includes("branch")
        ) {
          try {
            const julesRes = await fetch(`${origin}/api/jules/tasks`);
            if (julesRes.ok) {
              agentResponse.toolData.julesStatus = await julesRes.json();
            }
          } catch (e) {
            console.warn("[agents/route] builder jules fetch failed:", e.message);
          }
        }
      } else if (decision.agent === "sentinel") {
        try {
          const summaryRes = await fetch(`${origin}/api/costs/summary`);
          if (summaryRes.ok) agentResponse.toolData.costSummary = await summaryRes.json();
        } catch (e) {
           console.warn("[agents/route] sentinel summary fetch failed:", e.message);
        }
        try {
          const breakdownRes = await fetch(`${origin}/api/costs/breakdown`);
          if (breakdownRes.ok) agentResponse.toolData.costBreakdown = await breakdownRes.json();
        } catch (e) {
           console.warn("[agents/route] sentinel breakdown fetch failed:", e.message);
        }
      }

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
