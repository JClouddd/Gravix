import { structuredGenerate, generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAgentContext } from "@/lib/knowledgeEngine";

/**
 * Gets a routing decision from Conductor using Gemini structured output.
 */
async function getRoutingDecision(message, context) {
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

  return { decision, routingResult };
}

/**
 * Logs the routing decision to Firestore.
 */
async function logRoutingDecision(message, agent) {
  try {
    await adminDb.collection("agent_routing_log").add({
      message: message.substring(0, 100),
      selectedAgent: agent,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[agent_routing_log] Failed to log routing decision:", err.message);
  }
}

/**
 * Logs the API usage cost for routing.
 */
async function logRoutingCost(routingResult) {
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
}

/**
 * Fetches recent conversation history for a specific agent to provide context.
 */
async function getConversationContext(agentName) {
  let previousSummaries = [];
  try {
    const memoryQuery = adminDb.collection("agent_conversations")
      .where("agentName", "==", agentName)
      .orderBy("timestamp", "desc")
      .limit(5);
    const memSnapshot = await memoryQuery.get();
    previousSummaries = memSnapshot.docs.map(d => d.data().summary).reverse();
  } catch (err) {
    console.warn("[agents/route] failed to fetch memory context:", err.message);
  }

  return previousSummaries.length > 0
    ? `\n\nPrevious conversations for context:\n${previousSummaries.map((s, i) => `${i+1}. ${s}`).join("\n")}`
    : "";
}

/**
 * Executes specific tool endpoints based on the chosen agent.
 */
async function executeTools(agent, message, origin, agentResponse) {
  const lowerMsg = message.toLowerCase();

  if (agent === "forge") {
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
  } else if (agent === "scholar") {
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
  } else if (agent === "analyst") {
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
  } else if (agent === "courier") {
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
  } else if (agent === "builder") {
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
  } else if (agent === "sentinel") {
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
}

/**
 * Logs the API usage cost for agent execution.
 */
async function logAgentCost(agent, agentResult) {
  try {
    await logUsage({
      route: `/api/agents/${agent}`,
      model: agentResult.model,
      modelTier: agentResult.modelTier,
      inputTokens: agentResult.tokens.input,
      outputTokens: agentResult.tokens.output,
      totalTokens: agentResult.tokens.total,
      cost: agentResult.cost.totalCost,
      agent: agent,
    });
  } catch (err) {
    console.warn("[costTracker] Failed to log:", err.message);
  }
}

/**
 * Generates a summary and saves the interaction to Firestore for memory.
 */
async function saveConversationMemory(agent, message, agentText) {
  try {
    const summaryResult = await generate({
      prompt: `User said: "${message}"\nAgent replied: "${agentText}"\n\nProvide a very brief 1-line summary of this interaction.`,
      systemPrompt: "You are a summarizing assistant. Provide only a 1-line summary.",
      complexity: "flash",
    });

    await adminDb.collection("agent_conversations").add({
      agentName: agent,
      messages: [
        { role: "user", content: message },
        { role: "agent", content: agentText }
      ],
      summary: summaryResult.text.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
     console.warn("[agents/route] failed to save memory:", err.message);
  }
}

/**
 * Core handler to execute the selected specialist agent.
 */
async function executeSpecialistAgent(decision, message, origin) {
  // Fetch conversation history and knowledge context in parallel
  const [contextString, knowledgeCtx] = await Promise.all([
    getConversationContext(decision.agent),
    getAgentContext(decision.agent),
  ]);

  // Build system prompt with injected notebook knowledge
  let systemPrompt = `You are ${decision.agent}, a specialist agent in Gravix. ${decision.action}${contextString}`;
  if (knowledgeCtx.contextBlock) {
    systemPrompt += knowledgeCtx.contextBlock;
  }

  const agentResult = await generate({
    prompt: message,
    systemPrompt,
    complexity: decision.agent === "scholar" ? "pro" : "flash",
    grounded: decision.agent === "scholar" || decision.agent === "sentinel",
  });

  const agentResponse = {
    text: agentResult.text,
    model: agentResult.model,
    tokens: agentResult.tokens,
    cost: agentResult.cost,
    duration: agentResult.duration,
    grounded: agentResult.grounded,
    toolData: {},
    knowledgeContext: {
      notebooksInjected: knowledgeCtx.notebookCount,
      notebooks: knowledgeCtx.notebooks,
    },
  };

  await executeTools(decision.agent, message, origin, agentResponse);
  await logAgentCost(decision.agent, agentResult);
  await saveConversationMemory(decision.agent, message, agentResult.text);

  return agentResponse;
}

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

    const { decision, routingResult } = await getRoutingDecision(message, context);

    await logRoutingDecision(message, decision.agent);
    await logRoutingCost(routingResult);

    let agentResponse = null;
    if (execute && decision.confidence >= 0.6) {
      const origin = new URL(request.url).origin;
      agentResponse = await executeSpecialistAgent(decision, message, origin);
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
