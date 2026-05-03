import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const batch = adminDb.batch();

    // 1. Visual Command Center
    const vccSchema = {
      type: "grid",
      columns: 2,
      gap: 16,
      children: [
        {
          type: "card",
          title: "System Status",
          children: [
            { type: "text", content: "All systems nominal.", color: "var(--success)" },
            { type: "gauge", progress: 85, color: "var(--accent)" }
          ]
        },
        {
          type: "card",
          title: "Active Connections",
          children: [
            { type: "badge", variant: "info", label: "Agent Nexus: Connected" },
            { type: "badge", variant: "success", label: "Data Lake: Synced" }
          ]
        }
      ]
    };

    // 2. Interactive Kanban
    const kanbanSchema = {
      type: "grid",
      columns: 3,
      gap: 24,
      children: [
        {
          type: "card",
          title: "To Do",
          children: [
            { type: "text", content: "Task 1: System update" },
            { type: "button", label: "Start", action: "API_CALL", endpoint: "/api/tasks/start", method: "POST" }
          ]
        },
        {
          type: "card",
          title: "In Progress",
          children: [
            { type: "text", content: "Task 2: AI inference" }
          ]
        },
        {
          type: "card",
          title: "Done",
          children: [
            { type: "text", content: "Task 3: Backup complete", color: "var(--success)" }
          ]
        }
      ]
    };

    // 3. Node Flows
    const nodeFlowSchema = {
      type: "card",
      title: "Data Pipeline Flow",
      children: [
        { type: "text", content: "Ingestion -> Processing -> Storage", variant: "caption" },
        { type: "button", label: "Trigger Flow", action: "API_CALL", endpoint: "/api/flow/trigger", method: "POST", variant: "primary" }
      ]
    };

    batch.set(adminDb.collection("dynamic_ui").doc("visual_command_center"), vccSchema);
    batch.set(adminDb.collection("dynamic_ui").doc("interactive_kanban"), kanbanSchema);
    batch.set(adminDb.collection("dynamic_ui").doc("node_flows"), nodeFlowSchema);

    await batch.commit();

    return Response.json({ success: true, message: "Hub 3.0 UI schemas seeded successfully." });
  } catch (error) {
    logRouteError("ui_seed", "Failed to seed UI schemas", error, "/api/ui/seed");
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
