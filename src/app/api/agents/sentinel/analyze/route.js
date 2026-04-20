import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    // Read last 30 health check results from Firestore collection health_checks
    const checksRef = adminDb.collection("health_checks");
    const q = checksRef.orderBy("timestamp", "desc").limit(30);
    const snapshot = await q.get();

    const healthData = [];
    snapshot.forEach(doc => healthData.push(doc.data()));

    // Prepare prompt
    const prompt = `Analyze these health check results looking for cost patterns, error frequency, and latency trends. If you detect anomalies, propose monitoring rules.
Health Data: ${JSON.stringify(healthData, null, 2)}
Return JSON: { anomalies: [{ type, description, severity }], proposedRules: [{ condition, threshold, action, reason }] }`;

    // Send to Gemini
    const geminiResponse = await generate({
      prompt
    });

        let analysisResult;
    try {
      const cleanText = geminiResponse.text.replace(/```(json)?/g, "").trim();
      analysisResult = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e);
      logRouteError("agent", "/api/agents/sentinel/analyze error", e, "/api/agents/sentinel/analyze");
      analysisResult = { anomalies: [], proposedRules: [] };
    }

    // Store proposals in Firestore collection rule_proposals
    const proposalsRef = adminDb.collection("rule_proposals");
    const docRef = await proposalsRef.add( {
      ...analysisResult,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      analyzed: true,
      anomalies: analysisResult.anomalies || [],
      proposedRules: analysisResult.proposedRules || [],
      proposalId: docRef.id
    });
  } catch (error) {
    console.error("Error running Sentinel analysis:", error);
    logRouteError("agent", "/api/agents/sentinel/analyze error", error, "/api/agents/sentinel/analyze");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const proposalsRef = adminDb.collection("rule_proposals");
    const q = proposalsRef.orderBy("createdAt", "desc").limit(10);
    const snapshot = await q.get();

    const proposals = [];
    snapshot.forEach(doc => {
      proposals.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("Error fetching rule proposals:", error);
    logRouteError("agent", "/api/agents/sentinel/analyze error", error, "/api/agents/sentinel/analyze");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
