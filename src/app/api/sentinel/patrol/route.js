import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const origin = new URL(request.url).origin;
    const checks = [];
    const errorsList = [];
    const staleLocksList = [];
    let status = "healthy";

    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Check Firestore connectivity
    try {
      const start = Date.now();
      await adminDb.collection("system_config").limit(1).get();
      checks.push({
        name: "firestore",
        status: "pass",
        latency: Date.now() - start,
      });
    } catch (error) {
      logRouteError("firestore", "Sentinel Patrol: Firestore check failed", error, "/api/sentinel/patrol");
      checks.push({
        name: "firestore",
        status: "fail",
        error: error.message,
      });
      status = "critical";
    }

    // 2. Check all API route groups are responding
    try {
      const start = Date.now();
      const healthRes = await fetch(`${origin}/api/health`, { redirect: 'error' });
      const healthData = await healthRes.json();
      if (!healthRes.ok) {
        throw new Error(`Health API returned status ${healthRes.status}`);
      }
      checks.push({
        name: "api_health",
        status: "pass",
        latency: Date.now() - start,
        details: healthData.status,
      });
      if (healthData.status === "down") {
        status = "critical";
      } else if (healthData.status === "degraded" && status !== "critical") {
        status = "degraded";
      }
    } catch (error) {
      logRouteError("runtime", "Sentinel Patrol: API Health check failed", error, "/api/sentinel/patrol");
      checks.push({
        name: "api_health",
        status: "fail",
        error: error.message,
      });
      status = "critical";
    }

    // 3. Check for recent errors in system_errors collection
    try {
      const start = Date.now();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const errorSnap = await adminDb
        .collection("system_errors")
        .where("createdAt", ">=", oneHourAgo)
        .get();

      errorSnap.forEach((doc) => {
        errorsList.push({ id: doc.id, ...doc.data() });
      });

      checks.push({
        name: "system_errors",
        status: "pass",
        latency: Date.now() - start,
        count: errorsList.length,
      });

      if (errorsList.length > 0 && status !== "critical") {
        status = "degraded";
      }
    } catch (error) {
      logRouteError("firestore", "Sentinel Patrol: System errors check failed", error, "/api/sentinel/patrol");
      checks.push({
        name: "system_errors",
        status: "fail",
        error: error.message,
      });
      if (status !== "critical") status = "degraded";
    }

    // 4. Check jules_file_locks for stale locks
    try {
      const start = Date.now();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const locksSnap = await adminDb
        .collection("jules_file_locks")
        .where("createdAt", "<=", twentyFourHoursAgo)
        .get();

      locksSnap.forEach((doc) => {
        staleLocksList.push({ id: doc.id, ...doc.data() });
      });

      checks.push({
        name: "stale_locks",
        status: "pass",
        latency: Date.now() - start,
        count: staleLocksList.length,
      });

      if (staleLocksList.length > 0 && status !== "critical") {
        status = "degraded";
      }
    } catch (error) {
      logRouteError("firestore", "Sentinel Patrol: Stale locks check failed", error, "/api/sentinel/patrol");
      checks.push({
        name: "stale_locks",
        status: "fail",
        error: error.message,
      });
      if (status !== "critical") status = "degraded";
    }

    return Response.json({
      status,
      checks,
      errors: errorsList,
      stale_locks: staleLocksList,
      timestamp,
    });
  } catch (error) {
    logRouteError("runtime", "Sentinel Patrol: Unhandled exception", error, "/api/sentinel/patrol");
    return Response.json(
      {
        status: "critical",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
