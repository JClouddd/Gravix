import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, addDoc } from "firebase/firestore";
import { generate } from "@/lib/geminiClient";

export async function POST(request) {
  try {
    // Read last 30 health check results from Firestore collection health_checks
    const checksRef = collection(db, "health_checks");
    const q = query(checksRef, orderBy("timestamp", "desc"), limit(30));
    const snapshot = await getDocs(q);

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
      analysisResult = { anomalies: [], proposedRules: [] };
    }


    // Store proposals in Firestore collection rule_proposals
    const proposalsRef = collection(db, "rule_proposals");
    const docRef = await addDoc(proposalsRef, {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const proposalsRef = collection(db, "rule_proposals");
    const q = query(proposalsRef, orderBy("createdAt", "desc"), limit(10));
    const snapshot = await getDocs(q);

    const proposals = [];
    snapshot.forEach(doc => {
      proposals.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("Error fetching rule proposals:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
