/**
 * GET /api/agents/roster
 * Returns all 7 agents with current status
 */
export async function GET() {
  const agents = [
    {
      id: "conductor",
      name: "Conductor",
      role: "Orchestrator — routes requests to the right agent",
      status: "not_deployed",
      selfImprove: "Meta-Agent: creates new agents when gaps found",
      color: "#6C5CE7",
      icon: "🎯",
      costs: { period: 0, total: 0 },
    },
    {
      id: "forge",
      name: "Forge",
      role: "DevOps — MCP, secrets, IAM, APIs, health checks",
      status: "not_deployed",
      selfImprove: "Auto-Config: updates on API changes",
      color: "#E17055",
      icon: "🔧",
      costs: { period: 0, total: 0 },
    },
    {
      id: "scholar",
      name: "Scholar",
      role: "Knowledge — ingestion, research, documentation",
      status: "not_deployed",
      selfImprove: "Self-Indexing: auto cross-references",
      color: "#00B894",
      icon: "📚",
      costs: { period: 0, total: 0 },
    },
    {
      id: "analyst",
      name: "Analyst",
      role: "Data science — Colab, analysis, ML, charts",
      status: "not_deployed",
      selfImprove: "Notebook Factory: drafts new notebooks",
      color: "#A29BFE",
      icon: "📈",
      costs: { period: 0, total: 0 },
    },
    {
      id: "courier",
      name: "Courier",
      role: "Communications — email, calendar, tasks, Meet, notifications",
      status: "not_deployed",
      selfImprove: "Template Learning: auto-creates templates",
      color: "#4299E1",
      icon: "📨",
      costs: { period: 0, total: 0 },
    },
    {
      id: "sentinel",
      name: "Sentinel",
      role: "Security — costs, monitoring, agent health, rules",
      status: "not_deployed",
      selfImprove: "Rule Generation: proposes from anomalies",
      color: "#E74C3C",
      icon: "🛡️",
      costs: { period: 0, total: 0 },
    },
    {
      id: "builder",
      name: "Builder",
      role: "Code — branches, generation, Jules integration, patterns",
      status: "not_deployed",
      selfImprove: "Pattern Library: extracts reusable patterns",
      color: "#F1C40F",
      icon: "🏗️",
      costs: { period: 0, total: 0 },
    },
  ];

  return Response.json({
    agents,
    totalDeployed: agents.filter((a) => a.status === "active").length,
    totalAgents: agents.length,
  });
}

/**
 * POST /api/agents/roster
 * Orchestrate — route a request through Conductor
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

    // TODO: Wire to Vertex AI Agent Builder once deployed
    return Response.json({
      status: "not_deployed",
      message: "Agents are not yet deployed to Vertex AI. Complete Phase 7 to enable orchestration.",
      receivedMessage: message,
      targetAgent: targetAgent || "conductor",
      mode,
    });
  } catch (error) {
    console.error("[/api/agents/roster]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
