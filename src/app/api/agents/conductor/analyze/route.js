import { collection, query, orderBy, limit, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { structuredGenerate } from "@/lib/geminiClient";

export async function POST(request) {
  try {
    const logsRef = collection(db, "agent_routing_log");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
    const querySnapshot = await getDocs(q);

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
    }

    const proposalsRef = collection(db, "agent_proposals");
    const timestamp = new Date().toISOString();

    for (const proposal of generatedProposals) {
      await addDoc(proposalsRef, {
        ...proposal,
        status: "pending",
        timestamp,
      });
    }

    return Response.json({ analyzed: true, proposals: generatedProposals, timestamp });
  } catch (error) {
    console.error("[conductor/analyze] POST Error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const proposalsRef = collection(db, "agent_proposals");
    const q = query(proposalsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const proposals = [];
    querySnapshot.forEach((doc) => {
      proposals.push({ id: doc.id, ...doc.data() });
    });

    return Response.json({ proposals });
  } catch (error) {
    console.error("[conductor/analyze] GET Error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return Response.json({ error: "Missing id or status" }, { status: 400 });
    }

    const proposalDoc = doc(db, "agent_proposals", id);
    await updateDoc(proposalDoc, { status });

    return Response.json({ success: true, id, status });
  } catch (error) {
    console.error("[conductor/analyze] PUT Error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
