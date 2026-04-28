import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/automation/killswitch
 * Engages the emergency killswitch to halt all autonomous agents, loops, and ingestions.
 */
export async function POST() {
  try {
    const sysRef = adminDb.collection("system").doc("automation_status");
    await sysRef.set({
      killswitchEngaged: true,
      engagedAt: new Date().toISOString(),
      reason: "Manual Killswitch triggered from Dashboard via Token Burn Velocity Meter",
      activePipelinesHalted: true
    }, { merge: true });

    // Also push a global notification to the audit log or notifications
    await adminDb.collection("notifications").add({
      title: "🛑 EMERGENCY KILLSWITCH ENGAGED",
      message: "All autonomous pipelines have been forcefully halted.",
      type: "error",
      timestamp: new Date().toISOString(),
      read: false
    });

    return Response.json({ success: true, message: "Killswitch engaged successfully" });
  } catch (error) {
    logRouteError("automation", "/api/automation/killswitch error", error, "/api/automation/killswitch");
    return Response.json(
      { success: false, error: error.message || "Failed to engage killswitch" },
      { status: 500 }
    );
  }
}
