import { adminDb } from "@/lib/firebaseAdmin";

const AGENTS = [
  { id: "agt-conductor", type: "Agent", label: "Ask Conductor", icon: "⚡", module: "agents", desc: "Route a complex request" },
  { id: "agt-scholar", type: "Agent", label: "Ask Scholar", icon: "🦉", module: "agents", desc: "Research or query docs" },
  { id: "agt-courier", type: "Agent", label: "Ask Courier", icon: "🕊️", module: "agents", desc: "Draft comms or summarize emails" },
  { id: "agt-sentinel", type: "Agent", label: "Ask Sentinel", icon: "🛡️", module: "agents", desc: "Check alerts and system security" },
];

const COMMANDS = [
  { id: "nav-home", type: "Navigation", label: "Go to Home", icon: "🏠", module: "home" },
  { id: "nav-finance", type: "Navigation", label: "Go to Finance", icon: "💰", module: "finance" },
  { id: "nav-email", type: "Navigation", label: "Go to Email", icon: "✉️", module: "email" },
  { id: "nav-planner", type: "Navigation", label: "Go to Planner", icon: "📅", module: "planner" },
  { id: "nav-agents", type: "Navigation", label: "Go to Agents", icon: "🤖", module: "agents" },
  { id: "nav-knowledge", type: "Navigation", label: "Go to Knowledge", icon: "🧠", module: "knowledge" },
  { id: "nav-clients", type: "Navigation", label: "Go to Clients", icon: "👥", module: "clients" },
  { id: "nav-colab", type: "Navigation", label: "Go to Colab", icon: "📊", module: "colab" },
  { id: "nav-settings", type: "Navigation", label: "Go to Settings", icon: "⚙️", module: "settings" },
  { id: "act-email", type: "Action", label: "Compose Email", icon: "✏️", module: "email", desc: "Draft a new email" },
  { id: "act-task", type: "Action", label: "Create Task", icon: "✅", module: "planner", desc: "Add a new task to Planner" },
  { id: "act-client", type: "Action", label: "Create Client", icon: "➕", module: "clients", desc: "Add a new client profile" },
  { id: "act-notebook", type: "Action", label: "Run Notebook", icon: "▶️", module: "colab", desc: "Execute a Colab notebook" },
  { id: "act-search", type: "Action", label: "Search Knowledge", icon: "🔍", module: "knowledge", desc: "Search through ingested docs" },
  { id: "act-health", type: "Action", label: "Check Health", icon: "🩺", module: "home", desc: "Run system diagnostics" },
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q) {
      return Response.json({ results: [], total: 0 });
    }

    const queryLower = q.toLowerCase();
    const results = [];

    // 1. Search Agents
    const agentMatches = AGENTS.filter(
      (agent) => agent.label.toLowerCase().includes(queryLower) || agent.desc.toLowerCase().includes(queryLower)
    );
    agentMatches.forEach((match) => {
      results.push({
        type: "Agent",
        title: match.label,
        description: match.desc,
        action: match.id,
        module: match.module,
        icon: match.icon,
      });
    });

    // 2. Search Commands
    const commandMatches = COMMANDS.filter(
      (cmd) => cmd.label.toLowerCase().includes(queryLower) || (cmd.desc && cmd.desc.toLowerCase().includes(queryLower))
    );
    commandMatches.forEach((match) => {
      results.push({
        type: match.type,
        title: match.label,
        description: match.desc || `Navigate to ${match.module}`,
        action: match.id,
        module: match.module,
        icon: match.icon,
      });
    });

    // 3. Search Clients from Firestore
    try {
      const clientsSnapshot = await adminDb.collection("clients").get();
      clientsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (
          (data.name && data.name.toLowerCase().includes(queryLower)) ||
          (data.company && data.company.toLowerCase().includes(queryLower))
        ) {
          results.push({
            type: "Client",
            title: data.name,
            description: data.company || "Client Profile",
            action: `client-${doc.id}`,
            module: "clients",
            icon: "👥",
          });
        }
      });
    } catch (err) {
      console.warn("Failed to search clients:", err.message);
    }

    // 4. Search Knowledge
    try {
      // Need absolute URL for fetching from our own API route during SSR/API execution
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      const knowledgeRes = await fetch(`${baseUrl}/api/knowledge/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, source: "all", mode: "hybrid" }),
      });

      if (knowledgeRes.ok) {
        const data = await knowledgeRes.json();
        if (data.results && data.results.length > 0) {
          data.results.forEach((doc) => {
            results.push({
              type: "Knowledge",
              title: doc.title,
              description: doc.snippet || "Document match",
              action: doc.uri || "knowledge-doc",
              module: "knowledge",
              icon: "🧠",
            });
          });
        }
      }
    } catch (err) {
      console.warn("Failed to search knowledge:", err.message);
    }

    return Response.json({
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("[/api/search]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
