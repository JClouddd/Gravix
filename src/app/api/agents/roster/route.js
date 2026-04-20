import { generate, structuredGenerate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import registry from "@/../agents/registry.json";

const AGENT_EXTRAS = {
  conductor: {
    selfImprove: "Meta-Agent: creates new agents when gaps found",
    color: "#6C5CE7",
    icon: "🎯",
    backend: "gemini",
    model: "gemini-2.5-flash",
  },
  forge: {
    selfImprove: "Auto-Config: updates on API changes",
    color: "#E17055",
    icon: "🔧",
    backend: "pending",
    model: "gemini-2.5-flash",
  },
  scholar: {
    selfImprove: "Self-Indexing: auto cross-references",
    color: "#00B894",
    icon: "📚",
    backend: "discovery_engine",
    model: "gemini-2.5-pro",
    dataStoreId: "gravix-knowledge",
    engineId: "gravix-scholar",
  },
  analyst: {
    selfImprove: "Notebook Factory: drafts new notebooks",
    color: "#A29BFE",
    icon: "📈",
    backend: "pending",
    model: "gemini-2.5-pro",
  },
  courier: {
    selfImprove: "Template Learning: auto-creates templates",
    color: "#4299E1",
    icon: "📨",
    backend: "pending",
    model: "gemini-2.5-flash",
  },
  sentinel: {
    selfImprove: "Rule Generation: proposes from anomalies",
    color: "#E74C3C",
    icon: "🛡️",
    backend: "gemini",
    model: "gemini-2.5-flash",
  },
  builder: {
    selfImprove: "Pattern Library: extracts reusable patterns",
    color: "#F1C40F",
    icon: "🏗️",
    backend: "pending",
    model: "gemini-2.5-pro",
  },
};

/**
 * Agent registry — dynamically built from registry.json
 */
const AGENT_REGISTRY = Object.entries(registry.agents).map(([id, data]) => ({
  id,
  name: data.displayName,
  role: data.role,
  status: "active",
  dialogflowCxId: data.id,
  skills: (data.skills || []).map(skill => ({
    ...skill,
    linkedNotebooks: []
  })),
  subAgents: data.subAgents || [],
  ...AGENT_EXTRAS[id],
}));

/**
 * GET /api/agents/roster
 * Returns all 7 agents with current status and costs
 */
export async function GET() {
  const agents = AGENT_REGISTRY.map((a) => ({
    ...a,
    costs: { period: 0, total: 0 },
  }));

  return Response.json({
    agents,
    totalDeployed: agents.filter((a) => a.status === "active").length,
    totalAgents: agents.length,
  });
}

/**
 * POST /api/agents/roster
 * Orchestrate — Conductor receives a message and routes it to the right agent,
 * then executes the agent's response.
 */
export async function POST(request) {
  try {
    const { message, targetAgent, mode = "step" } = await request.json();

    if (!message) {
      return Response.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // If a specific agent is targeted, skip routing
    if (targetAgent && targetAgent !== "conductor") {
      const agent = AGENT_REGISTRY.find((a) => a.id === targetAgent);
      if (!agent) {
        return Response.json({ error: `Agent '${targetAgent}' not found` }, { status: 404 });
      }
      if (agent.status !== "active") {
        return Response.json({
          agent: agent.id,
          status: agent.status,
          message: `${agent.name} is in ${agent.status} mode. It will be activated when its backend is wired.`,
        });
      }

      const result = await executeAgent(agent, message);
      return Response.json(result);
    }

    // Route through Conductor
    const routing = await routeRequest(message);

    // If mode is "step", just return the routing decision
    if (mode === "step") {
      return Response.json({
        routing,
        mode,
        message: "Routing decision made. Send again with mode='execute' to run the agent.",
      });
    }

    // If mode is "execute" or "autonomous", run the target agent
    const targetAgentConfig = AGENT_REGISTRY.find((a) => a.id === routing.agent);
    if (!targetAgentConfig || targetAgentConfig.status !== "active") {
      return Response.json({
        routing,
        message: `${routing.agent} is not yet active. Routing suggests: ${routing.reasoning}`,
      });
    }

    const result = await executeAgent(targetAgentConfig, message);
    return Response.json({ routing, ...result });
  } catch (error) {
    console.error("[/api/agents/roster]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ── Conductor Routing ─────────────────────────────────────────── */
async function routeRequest(message) {
  const schema = {
    type: "object",
    properties: {
      agent: {
        type: "string",
        enum: AGENT_REGISTRY.map((a) => a.id),
      },
      reasoning: { type: "string" },
      action: { type: "string" },
      confidence: { type: "number" },
    },
    required: ["agent", "reasoning", "action", "confidence"],
  };

  const result = await structuredGenerate({
    prompt: `Analyze this request and decide which agent should handle it:

"${message}"

Available agents:
${AGENT_REGISTRY.map((a) => `- ${a.id} (${a.status}): ${a.role}`).join("\n")}

Choose the best agent. If the agent is not "active", still suggest the best one but note it's not available yet.`,
    schema,
    systemPrompt:
      "You are Conductor, the orchestrator for Gravix. Route requests to the most appropriate agent.",
    complexity: "flash",
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return { agent: "scholar", reasoning: "Default fallback", action: message, confidence: 0.5 };
  }
}

/* ── Agent Execution ───────────────────────────────────────────── */
async function executeAgent(agent, message) {
  const systemPrompts = {
    conductor: "You are Conductor, the orchestrator for Gravix. Help coordinate tasks across agents.",
    scholar:
      "You are Scholar, the knowledge agent for Gravix. Answer questions accurately, cite sources, and help with research and documentation.",
    sentinel:
      "You are Sentinel, the security and monitoring agent for Gravix. Report on system health, costs, anomalies, and enforce rules. You operate independently — no other agent can override your alerts.",
  };

  const result = await generate({
    prompt: message,
    systemPrompt: systemPrompts[agent.id] || `You are ${agent.name}, a specialist agent in Gravix. ${agent.role}`,
    complexity: agent.id === "scholar" ? "pro" : "flash",
    grounded: agent.id === "scholar",
  });

  // Log the usage
  try {
    await logUsage({
      route: `/api/agents/${agent.id}`,
      model: result.model,
      modelTier: result.modelTier,
      inputTokens: result.tokens.input,
      outputTokens: result.tokens.output,
      totalTokens: result.tokens.total,
      cost: result.cost.totalCost,
      agent: agent.id,
    });
  } catch (err) {
    console.warn("[costTracker] Failed to log usage:", err.message);
  }

  return {
    agent: agent.id,
    agentName: agent.name,
    status: "ok",
    response: result.text,
    model: result.model,
    modelTier: result.modelTier,
    tokens: result.tokens,
    cost: result.cost,
    duration: result.duration,
    grounded: result.grounded,
    groundingMetadata: result.groundingMetadata,
  };
}
