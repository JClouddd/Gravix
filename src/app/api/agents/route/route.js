import { structuredGenerate, generate } from "@/lib/geminiClient";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAgentContext } from "@/lib/knowledgeEngine";
import { logRouteError } from "@/lib/errorLogger";

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
    logRouteError("agent", "/api/agents/route error", err, "/api/agents/route");
      console.warn("[agent_routing_log] Failed to log routing decision:", err.message);
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
    logRouteError("agent", "/api/agents/route error", err, "/api/agents/route");
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
  const baseUrl = "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app";

  if (agent === "forge") {
    try {
      const statusRes = await fetch(`${baseUrl}/api/knowledge/status`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        agentResponse.toolData.systemStatus = data;
        agentResponse.text += `\n\n**System Status:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
    } catch (e) {
      logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] forge status fetch failed:", e.message);
    }
    try {
      const costsRes = await fetch(`${baseUrl}/api/costs/summary`);
      if (costsRes.ok) {
        const data = await costsRes.json();
        agentResponse.toolData.costs = data;
        agentResponse.text += `\n\n**Costs Summary:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
    } catch (e) {
      logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] forge costs fetch failed:", e.message);
    }
  } else if (agent === "scholar") {
    try {
      const queryRes = await fetch(`${baseUrl}/api/knowledge/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: message }),
      });
      if (queryRes.ok) {
        const data = await queryRes.json();
        agentResponse.toolData.groundedResults = data;
        agentResponse.text += `\n\n**Grounded Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
    } catch (e) {
      logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] scholar query fetch failed:", e.message);
    }
  } else if (agent === "analyst") {
    if (
      lowerMsg.includes("stock") ||
      lowerMsg.includes("ticker") ||
      lowerMsg.includes("analysis")
    ) {
      try {
        const colabRes = await fetch(`${baseUrl}/api/colab/execute`);
        if (colabRes.ok) {
          const data = await colabRes.json();
          agentResponse.toolData.notebooks = data.notebooks;
          if (data.notebooks && data.notebooks.length > 0) {
            agentResponse.text += `\n\n**Suggested Notebooks:**\n${data.notebooks.map(n => `- ${n.name || n}`).join('\n')}`;
          }
        }
      } catch (e) {
         logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
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
        const emailRes = await fetch(`${baseUrl}/api/email/inbox`);
        if (emailRes.ok) {
          const data = await emailRes.json();
          agentResponse.toolData.emailStatus = data;
          agentResponse.text += `\n\n**Gmail Connection Status:** ${data.status || 'Connected'}`;
        }
      } catch (e) {
        logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
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
        const julesRes = await fetch(`${baseUrl}/api/jules/tasks`);
        if (julesRes.ok) {
          const data = await julesRes.json();
          agentResponse.toolData.julesStatus = data;
          const sessionCount = typeof data.activeCount !== 'undefined' ? data.activeCount : (Array.isArray(data) ? data.length : 0);
          agentResponse.text += `\n\n**Active Jules Sessions:** ${sessionCount}`;
        }
      } catch (e) {
        logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] builder jules fetch failed:", e.message);
      }
    }
  } else if (agent === "sentinel") {
    try {
      const summaryRes = await fetch(`${baseUrl}/api/costs/summary`);
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        agentResponse.toolData.costSummary = data;
        agentResponse.text += `\n\n**Cost Summary & Budget:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
    } catch (e) {
       logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] sentinel summary fetch failed:", e.message);
    }
    try {
      const breakdownRes = await fetch(`${baseUrl}/api/costs/breakdown`);
      if (breakdownRes.ok) {
        const data = await breakdownRes.json();
        agentResponse.toolData.costBreakdown = data;
        agentResponse.text += `\n\n**Cost Breakdown:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
    } catch (e) {
       logRouteError("agent", "/api/agents/route error", e, "/api/agents/route");
      console.warn("[agents/route] sentinel breakdown fetch failed:", e.message);
    }
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
     logRouteError("agent", "/api/agents/route error", err, "/api/agents/route");
      console.warn("[agents/route] failed to save memory:", err.message);
  }
}

/**
 * Core handler to execute the selected specialist agent.
 */
async function executeAgent(decision, message, origin) {
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

    let agentResponse = null;
    if (execute && decision.confidence >= 0.6) {
      const origin = new URL(request.url).origin;
      agentResponse = await executeAgent(decision, message, origin);
    }

    return Response.json({
      routing: decision,
      response: agentResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/agents/route]", error);
    logRouteError("agent", "/api/agents/route error", error, "/api/agents/route");
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
