import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Import health checks logic
import { GET as getHealth } from "@/app/api/health/route";
// Import analyze logic
import { POST as runAnalyze } from "@/app/api/agents/sentinel/analyze/route";

export async function POST(request) {
  try {
    const origin = new URL(request.url).origin;

    // 1. Run main health checks
    let healthData = {};
    try {
      // Mock request object for the health endpoint
      const mockReq = { url: request.url };
      const healthRes = await getHealth(mockReq);
      healthData = await healthRes.json();
    } catch (error) {
      console.error("Failed to run health checks from sentinel:", error);
      healthData = { error: error.message };
    }

    // 2. Fetch active rules
    const rulesRef = adminDb.collection("sentinel_rules");
    const q = rulesRef.where("active", "==", true);
    const rulesSnapshot = await q.get();
    const rules = [];
    rulesSnapshot.forEach(doc => rules.push({ id: doc.id, ...doc.data() }));

    // 3. Evaluate rules
    const triggeredRules = [];

    // Pre-calculate aggregate metrics outside the loop to avoid redundant object allocation and iteration
    let globalMaxLatency = 0;
    let globalFailedServices = 0;
    if (healthData.services) {
      const servicesArray = Object.values(healthData.services);
      if (servicesArray.length > 0) {
        globalMaxLatency = Math.max(...servicesArray.map(s => s.latency || 0));
      }
      globalFailedServices = servicesArray.filter(s => s.status === "fail").length;
    }

    for (const rule of rules) {
      const { condition, threshold, action } = rule;
      let thresholdExceeded = false;

      const numThreshold = Number(threshold);

      // Simple evaluation logic for common condition formats
      // E.g., condition "latency" or "gemini.latency"
      if (condition && !isNaN(numThreshold) && healthData.services) {
        if (condition.includes("latency")) {
          // Check overall or specific service latency
          const serviceName = condition.split(".")[0];
          if (healthData.services[serviceName] && healthData.services[serviceName].latency) {
            if (healthData.services[serviceName].latency > numThreshold) {
              thresholdExceeded = true;
            }
          } else {
            // Check max latency across services using pre-calculated value
            if (globalMaxLatency > numThreshold) {
              thresholdExceeded = true;
            }
          }
        } else if (condition.includes("error") || condition.includes("fail")) {
          // If condition is just "error" and threshold is > 0 using pre-calculated value
          if (globalFailedServices >= numThreshold) {
            thresholdExceeded = true;
          }
        }
      }

      if (thresholdExceeded) {
        triggeredRules.push(rule);
        // Execute action (simulate FCM notification by writing to a notifications collection)
        console.log(`Sentinel rule triggered: ${condition} > ${threshold}. Action: ${action}`);
        try {
          const notificationsRef = adminDb.collection("notifications");
          await notificationsRef.add( {
            title: "Sentinel Alert",
            message: `Rule triggered: ${condition} exceeded threshold ${threshold}`,
            action: action,
            timestamp: new Date().toISOString(),
            read: false
          });
        } catch (notifError) {
          console.error("Failed to simulate notification:", notifError);
        }
      }
    }

    // 4. Call analyze endpoint
    let analyzeResult = {};
    try {
      const mockReq = { json: async () => ({}) };
      const analyzeRes = await runAnalyze(mockReq);
      analyzeResult = await analyzeRes.json();
    } catch (error) {
      console.error("Failed to run sentinel analysis:", error);
      analyzeResult = { error: error.message };
    }

    return NextResponse.json({
      success: true,
      healthData,
      triggeredRules,
      analyzeResult
    });
  } catch (error) {
    console.error("Error in sentinel-check:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
