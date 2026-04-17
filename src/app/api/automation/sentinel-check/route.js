import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";

async function runSentinelCheck(request) {
  const origin = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  let healthData = null;
  let costData = null;
  let alertsSent = 0;
  const issues = [];

  // a. Fetch health
  try {
    const res = await fetch(`${origin}/api/health`);
    if (res.ok) {
      healthData = await res.json();
    } else {
      issues.push(`Health API returned ${res.status}`);
    }
  } catch (error) {
    issues.push(`Failed to fetch health: ${error.message}`);
  }

  // b. Fetch costs
  try {
    const res = await fetch(`${origin}/api/costs/summary`);
    if (res.ok) {
      costData = await res.json();
    } else {
      issues.push(`Costs API returned ${res.status}`);
    }
  } catch (error) {
    issues.push(`Failed to fetch costs: ${error.message}`);
  }

  // c. Evaluate health
  let overallStatus = "healthy";
  let servicesChecked = 0;
  if (healthData && healthData.services) {
    servicesChecked = Object.keys(healthData.services).length;
    for (const [serviceName, serviceInfo] of Object.entries(healthData.services)) {
      if (serviceInfo.status !== "pass") {
        issues.push(`Service ${serviceName} is ${serviceInfo.status}: ${serviceInfo.error || "Unknown error"}`);
      }
    }
    if (healthData.status && healthData.status !== "healthy") {
      overallStatus = healthData.status;
    }
  } else if (!healthData) {
    overallStatus = "down";
  }

  // d. Evaluate costs
  let totalSpend = 0;
  let budgetThreshold = 72; // Default $72
  try {
    const sentinelDoc = await getDoc(doc(db, "settings", "sentinel_config"));
    if (sentinelDoc.exists()) {
      budgetThreshold = sentinelDoc.data().budgetThreshold || 72;
    }
  } catch (error) {
    console.error("Failed to fetch sentinel_config:", error);
  }

  if (costData && costData.totalSpend !== undefined) {
    totalSpend = costData.totalSpend;
    if (totalSpend > budgetThreshold) {
      issues.push(`Budget exceeded: $${totalSpend.toFixed(2)} > $${budgetThreshold.toFixed(2)}`);
      if (overallStatus === "healthy") {
        overallStatus = "degraded";
      }
    }
  }

  // e. If any issue found: Send notification
  if (issues.length > 0) {
    try {
      const payload = {
        title: "Sentinel Alert",
        body: issues[0] + (issues.length > 1 ? ` (+${issues.length - 1} more issues)` : ""),
        data: {
          type: "sentinel_alert",
          severity: overallStatus === "down" ? "critical" : "warning",
        }
      };

      const res = await fetch(`${origin}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alertsSent++;
      } else {
        console.error("Failed to send notification:", await res.text());
      }
    } catch (error) {
      console.error("Failed to notify:", error);
    }
  }

  const timestamp = new Date().toISOString();

  // f. Log check result to Firestore collection health_checks
  try {
    await addDoc(collection(db, "health_checks"), {
      timestamp,
      services: healthData?.services || {},
      costs: costData || {},
      alerts_sent: alertsSent,
      overall_status: overallStatus,
      issues
    });
  } catch (error) {
    console.error("Failed to log to health_checks:", error);
  }

  return NextResponse.json({
    status: overallStatus === "healthy" ? "success" : "issues_found",
    servicesChecked,
    alertsSent,
    timestamp
  });
}

export async function GET(request) {
  return runSentinelCheck(request);
}

export async function POST(request) {
  return runSentinelCheck(request);
}
