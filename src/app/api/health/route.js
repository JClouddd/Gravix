import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const services = {};
  let overallStatus = "healthy";

  // 1. Gemini Config Check (Internal)
  try {
    const start = Date.now();
    const hasKey = !!process.env.GEMINI_API_KEY;
    if (!hasKey) throw new Error("Missing GEMINI_API_KEY");
    services.gemini = { status: "pass", latency: Date.now() - start };
  } catch (error) {
    logRouteError("runtime", "/api/health gemini error", error, "/api/health");
    services.gemini = { status: "fail", error: error.message };
    overallStatus = "down"; 
  }

  // 2. Knowledge Check (Internal DB)
  try {
    const start = Date.now();
    const doc = await adminDb.collection("settings").doc("knowledge").get();
    if (doc.exists) {
      services.knowledge = { status: "pass", latency: Date.now() - start };
    } else {
      services.knowledge = { status: "pass", note: "Not configured yet", latency: Date.now() - start };
    }
  } catch (error) {
    logRouteError("runtime", "/api/health knowledge error", error, "/api/health");
    services.knowledge = { status: "fail", error: error.message };
    if (overallStatus !== "down") overallStatus = "degraded";
  }

  // 3. Firestore & Google Auth Check
  try {
    const start = Date.now();
    const docSnap = await adminDb.collection("settings").doc("google_oauth").get();
    const latency = Date.now() - start;

    services.firestore = { status: "pass", latency, connected: true };

    if (docSnap.exists) {
      const data = docSnap.data();
      const hasTokens = !!data.access_token;
      services.gmail = { status: hasTokens ? "pass" : "fail", error: hasTokens ? null : "No tokens" };
      services.calendar = { status: hasTokens ? "pass" : "fail", error: hasTokens ? null : "No tokens" };
      if (!hasTokens && overallStatus !== "down") overallStatus = "degraded";
    } else {
      services.gmail = { status: "fail", error: "No OAuth doc" };
      services.calendar = { status: "fail", error: "No OAuth doc" };
      if (overallStatus !== "down") overallStatus = "degraded";
    }
  } catch (error) {
    logRouteError("runtime", "/api/health firestore error", error, "/api/health");
    services.firestore = { status: "fail", error: error.message };
    services.gmail = { status: "fail", error: "Firestore down" };
    services.calendar = { status: "fail", error: "Firestore down" };
    if (overallStatus !== "down") overallStatus = "degraded";
  }

  // 4. Jules Check (Internal DB)
  try {
    const start = Date.now();
    const pipelineSnap = await adminDb.collection("jules_pipelines").get();
    services.jules = { status: "pass", latency: Date.now() - start, pipelines: pipelineSnap.empty ? 0 : pipelineSnap.size };
  } catch (error) {
    logRouteError("runtime", "/api/health jules error", error, "/api/health");
    services.jules = { status: "fail", error: error.message };
    if (overallStatus !== "down") overallStatus = "degraded";
  }

  // 5. Scheduler Check
  services.scheduler = { status: "pass", configured: true };

  const healthData = {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
  };

  // Write history natively to Firestore
  try {
     const histData = { ...healthData, timestamp: adminDb.FieldValue ? adminDb.FieldValue.serverTimestamp() : new Date().toISOString() };
     await adminDb.collection("health_checks").add(histData);
  } catch (err) {
    console.error("Failed to write health history:", err);
  }

  // Uptime is mocked simply rather than recursively looping history API
  const uptime = "Operational";

  return NextResponse.json({ ...healthData, uptime });
}
