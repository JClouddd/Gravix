
import { adminDb } from "@/lib/firebaseAdmin";
import { structuredGenerate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const logsRef = adminDb.collection("agent_routing_log");
    const q = logsRef.orderBy("timestamp", "desc").limit(100);
    const querySnapshot = await q.get();

    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data());
    });

    if (logs.length < 10) {
      return Response.json({ skipped: true, reason: "Not enough data" });
    }

    const proposalsSchema = {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              reason: { type: "string" },
            },
            required: ["name", "role", "reason"],
          },
        },
      },
      required: ["proposals"],
    };

    const prompt = `Analyze the following agent routing logs and identify any patterns, gaps, or repeated tasks that aren't well-handled by the current 7 agents (Forge, Scholar, Analyst, Courier, Sentinel, Builder, Conductor). Propose new specialist agents that could handle these tasks better.

    Routing logs:
    ${JSON.stringify(logs, null, 2)}

    If you don't find any clear gaps, you can return an empty list of proposals. Otherwise, propose 1 to 3 new agents.
    `;

    const result = await structuredGenerate({
      prompt,
      schema: proposalsSchema,
      systemPrompt: "You are the Conductor intelligence analyzing routing patterns.",
      complexity: "pro",
    });

    let generatedProposals = [];
    try {
      const parsed = JSON.parse(result.text);
      if (parsed && Array.isArray(parsed.proposals)) {
        generatedProposals = parsed.proposals;
      }
    } catch (e) {
      console.error("[conductor/analyze] Error parsing gemini response", e);
      logRouteError("agent", "/api/agents/conductor/analyze error", e, "/api/agents/conductor/analyze");
    }

    const proposalsRef = adminDb.collection("agent_proposals");
    const timestamp = new Date().toISOString();

    if (generatedProposals.length > 0) {
      const batch = adminDb.batch();
      for (const proposal of generatedProposals) {
        const docRef = proposalsRef.doc();
        batch.set(docRef, {
          ...proposal,
          status: "pending",
          timestamp,
        });
      }
      await batch.commit();
    }

    return Response.json({ analyzed: true, proposals: generatedProposals, timestamp });
  } catch (error) {
    console.error("[conductor/analyze] POST Error:", error);
    logRouteError("agent", "/api/agents/conductor/analyze error", error, "/api/agents/conductor/analyze");
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const proposalsRef = adminDb.collection("agent_proposals");
    const q = proposalsRef.orderBy("timestamp", "desc");
    const querySnapshot = await q.get();

    const proposals = [];
    querySnapshot.forEach((doc) => {
      proposals.push({ id: doc.id, ...doc.data() });
    });

    return Response.json({ proposals });
  } catch (error) {
    console.error("[conductor/analyze] GET Error:", error);
    logRouteError("agent", "/api/agents/conductor/analyze error", error, "/api/agents/conductor/analyze");
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return Response.json({ error: "Missing id or status" }, { status: 400 });
    }

    const proposalDoc = adminDb.collection("agent_proposals").doc(id);
    await proposalDoc.update( { status });

    return Response.json({ success: true, id, status });
  } catch (error) {
    console.error("[conductor/analyze] PUT Error:", error);
    logRouteError("agent", "/api/agents/conductor/analyze error", error, "/api/agents/conductor/analyze");
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
