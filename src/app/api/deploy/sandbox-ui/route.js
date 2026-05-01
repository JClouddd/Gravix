import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const pilotSandboxSchema = {
      type: "grid",
      columns: "1",
      gap: 24,
      children: [
        {
          type: "card",
          title: "YouTube Factory - Pilot Sandbox",
          children: [
            {
              type: "grid",
              columns: "auto",
              gap: 16,
              children: [
                {
                  type: "button",
                  label: "Fetch Trends (Incubation)",
                  variant: "primary",
                  action: "API_CALL",
                  endpoint: "/api/youtube/trends",
                  method: "GET",
                  successMessage: "Trends Fetched!"
                },
                {
                  type: "button",
                  label: "Generate Master Script",
                  variant: "primary",
                  action: "API_CALL",
                  endpoint: "/api/youtube/incubation",
                  method: "POST",
                  successMessage: "Master Script Generation Queued!"
                },
                {
                  type: "button",
                  label: "Dispatch Veo 3",
                  variant: "primary",
                  action: "API_CALL",
                  endpoint: "/api/youtube/dispatch",
                  method: "POST",
                  successMessage: "Veo 3 Dispatched!"
                },
                {
                  type: "button",
                  label: "Cloud Run FFmpeg Assembly",
                  variant: "primary",
                  action: "API_CALL",
                  endpoint: "/api/youtube/assembly",
                  method: "POST",
                  successMessage: "Assembly Queued!"
                }
              ]
            }
          ]
        },
        {
          type: "grid",
          columns: "auto",
          gap: 24,
          children: [
            { type: "card", title: "Ideation", children: [] },
            { type: "card", title: "Scripting", children: [] },
            { type: "card", title: "Production", children: [] },
            { type: "card", title: "Review", children: [] },
            { type: "card", title: "Published", children: [] }
          ]
        }
      ]
    };

    const docRef = adminDb.collection("dynamic_ui").doc("youtube_pilot_sandbox");
    await docRef.set(pilotSandboxSchema);

    return Response.json({ success: true, message: "Sandbox UI deployed successfully" });
  } catch (error) {
    await logRouteError("deploy", "Deploy Sandbox UI Error", error, "/api/deploy/sandbox-ui");
    return Response.json({ success: false, error: "Failed to deploy Sandbox UI" }, { status: 500 });
  }
}
