import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
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
    const rulesRef = collection(db, "sentinel_rules");
    const q = query(rulesRef, where("active", "==", true));
    const rulesSnapshot = await getDocs(q);
    const rules = [];
    rulesSnapshot.forEach(doc => rules.push({ id: doc.id, ...doc.data() }));

    // 3. Evaluate rules
    const triggeredRules = [];
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
            // Check max latency across services
            const maxLatency = Math.max(...Object.values(healthData.services).map(s => s.latency || 0));
            if (maxLatency > numThreshold) {
              thresholdExceeded = true;
            }
          }
        } else if (condition.includes("error") || condition.includes("fail")) {
          // If condition is just "error" and threshold is > 0
          const failedServices = Object.values(healthData.services).filter(s => s.status === "fail").length;
          if (failedServices >= numThreshold) {
            thresholdExceeded = true;
          }
        }
      }

      if (thresholdExceeded) {
        triggeredRules.push(rule);
        // Execute action (simulate FCM notification by writing to a notifications collection)
        console.log(`Sentinel rule triggered: ${condition} > ${threshold}. Action: ${action}`);
        try {
          const notificationsRef = collection(db, "notifications");
          await addDoc(notificationsRef, {
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
