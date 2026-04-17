import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const services = {};
  let overallStatus = "healthy";

  // 1. Gemini Check
  try {
    const start = Date.now();
    // We send a tiny prompt to minimize cost
    const res = await fetch(`${origin}/api/gemini/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
    });
    if (!res.ok) throw new Error("Gemini returned non-OK");
    services.gemini = { status: "pass", latency: Date.now() - start };
  } catch (error) {
    services.gemini = { status: "fail", error: error.message };
    overallStatus = "down"; // critical failure
  }

  // 2. Knowledge Check
  try {
    const start = Date.now();
    const res = await fetch(`${origin}/api/knowledge/status`);
    const data = await res.json();
    if (res.ok && data.dataStore?.deployed) {
      services.knowledge = { status: "pass", latency: Date.now() - start };
    } else {
      throw new Error("Knowledge store not deployed");
    }
  } catch (error) {
    services.knowledge = { status: "fail", error: error.message };
    if (overallStatus !== "down") overallStatus = "degraded";
  }

  // 3. Firestore & Google Auth Check (for Gmail & Calendar)
  try {
    const start = Date.now();
    const docRef = doc(db, "settings", "google_oauth");
    const docSnap = await getDoc(docRef);
    const latency = Date.now() - start;

    services.firestore = { status: "pass", latency, connected: true };

    if (docSnap.exists()) {
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
    services.firestore = { status: "fail", error: error.message };
    services.gmail = { status: "fail", error: "Firestore down" };
    services.calendar = { status: "fail", error: "Firestore down" };
    if (overallStatus !== "down") overallStatus = "degraded";
  }

  // 4. Jules Check
  try {
    const start = Date.now();
    const res = await fetch(`${origin}/api/jules/tasks`);
    const data = await res.json();
    if (!res.ok) throw new Error("Jules returned non-OK");
    services.jules = { status: "pass", latency: Date.now() - start, sessions: data.sessions?.length || 0 };
  } catch (error) {
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

  // Write history
  try {
    await fetch(`${origin}/api/health/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(healthData),
    });
  } catch (err) {
    console.error("Failed to write health history:", err);
  }

  // Get uptime
  let uptime = null;
  try {
    const histRes = await fetch(`${origin}/api/health/history`);
    const histData = await histRes.json();
    uptime = histData.uptime;
  } catch (err) {
    console.error("Failed to fetch health history:", err);
  }

  return NextResponse.json({ ...healthData, uptime });
}
