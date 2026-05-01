import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const incubateModalSchema = {
      type: "card",
      title: "Channel Profile Manager",
      children: [
        {
          type: "text",
          content: "Configure your Media Empire properties below."
        },
        {
          type: "grid",
          columns: "2",
          gap: 16,
          children: [
            {
              type: "card",
              title: "Content Format",
              children: [
                { type: "text", content: "Select the content format for this channel." },
                { type: "button", label: "Independent Shorts", variant: "secondary" },
                { type: "button", label: "Independent Long Form", variant: "secondary" },
                { type: "button", label: "Funnel Mode", variant: "secondary" }
              ]
            },
            {
              type: "card",
              title: "Revenue Stack",
              children: [
                { type: "text", content: "Select the monetization methods." },
                { type: "button", label: "AdSense", variant: "secondary" },
                { type: "button", label: "Digital Products", variant: "secondary" },
                { type: "button", label: "Affiliate Links", variant: "secondary" }
              ]
            }
          ]
        },
        {
          type: "button",
          label: "Start Incubation",
          action: "API_CALL",
          endpoint: "/api/agents/incubate",
          successMessage: "Incubation started successfully!",
          payload: {
            wizardPayload: {
              channelName: "New Channel",
              niche: "Tech",
              targetAudience: "Developers",
              contentStrategy: "Shorts and long form",
              visualIdentity: {
                colorPalette: ["#000", "#FFF"],
                typography: "sans-serif"
              }
            }
          }
        }
      ]
    };

    const empireDashboardSchema = {
      type: "grid",
      columns: "1",
      gap: 24,
      children: [
        {
          type: "card",
          title: "Empire Dashboard",
          children: [
            { type: "text", content: "Net Worth Style Aggregate Metrics", variant: "caption" }
          ]
        },
        {
          type: "grid",
          columns: "3",
          gap: 16,
          children: [
            {
              type: "card",
              title: "Estimated Revenue",
              children: [
                { type: "text", content: "$0.00" }
              ]
            },
            {
              type: "card",
              title: "Total Views",
              children: [
                { type: "text", content: "0" }
              ]
            },
            {
              type: "card",
              title: "Subscriber Growth",
              children: [
                { type: "text", content: "+0" }
              ]
            }
          ]
        }
      ]
    };

    await adminDb.collection("dynamic_ui").doc("youtube_incubate_modal").set(incubateModalSchema);
    await adminDb.collection("dynamic_ui").doc("youtube_empire_dashboard").set(empireDashboardSchema);

    return Response.json({ success: true, message: "UI Schemas seeded successfully" });
  } catch (error) {
    await logRouteError(
      "youtube",
      "Seed UI Error",
      error,
      "/api/youtube/seed-ui"
    );
    return Response.json({ success: false, error: "Failed to seed schemas" }, { status: 500 });
  }
}
