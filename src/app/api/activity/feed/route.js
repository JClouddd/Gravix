import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const feed = [];

    // 1. Fetch from agent_routing_log (Last 5)
    try {
      const routingSnapshot = await adminDb.collection("agent_routing_log")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();

      routingSnapshot.forEach(doc => {
        const data = doc.data();
        feed.push({
          type: "agent",
          icon: "🤖",
          title: `Agent Routed: ${data.selectedAgent || "Unknown"}`,
          description: data.message || "No description",
          timestamp: data.timestamp
        });
      });
    } catch (err) {
      console.warn("Failed to fetch agent_routing_log:", err.message);
    }

    // 2. Fetch from health_checks (Last 5)
    try {
      const healthSnapshot = await adminDb.collection("health_checks")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();

      healthSnapshot.forEach(doc => {
        const data = doc.data();
        feed.push({
          type: "health",
          icon: "🩺",
          title: `Health Check: ${data.status || "Unknown"}`,
          description: `Checked ${Object.keys(data.services || {}).length} services`,
          timestamp: data.timestamp
        });
      });
    } catch (err) {
      console.warn("Failed to fetch health_checks:", err.message);
    }

    // 3. Fetch from ingestion_staging (Last 3)
    try {
      const ingestionSnapshot = await adminDb.collection("ingestion_staging")
        .orderBy("timestamp", "desc")
        .limit(3)
        .get();

      ingestionSnapshot.forEach(doc => {
        const data = doc.data();
        feed.push({
          type: "knowledge",
          icon: "🧠",
          title: `Document Ingested: ${data.title || "Untitled"}`,
          description: data.source || "Uploaded document",
          timestamp: data.timestamp || new Date().toISOString()
        });
      });
    } catch (err) {
      console.warn("Failed to fetch ingestion_staging:", err.message);
    }

    // 4. Fetch from api_usage (Last 3)
    try {
      const usageSnapshot = await adminDb.collection("api_usage")
        .orderBy("timestamp", "desc")
        .limit(3)
        .get();

      usageSnapshot.forEach(doc => {
        const data = doc.data();
        feed.push({
          type: "cost",
          icon: "💰",
          title: `API Usage: ${data.route || "Unknown"}`,
          description: `Cost: $${(data.cost || 0).toFixed(6)}`,
          timestamp: data.timestamp
        });
      });
    } catch (err) {
      console.warn("Failed to fetch api_usage:", err.message);
    }

    // Combine all into a single timeline sorted by timestamp (newest first)
    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return Response.json({
      feed,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("[/api/activity/feed]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
