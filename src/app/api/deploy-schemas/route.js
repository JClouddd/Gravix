import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const schemaId = "youtube_incubation_modal";
    const schema = {
      type: "card",
      title: "Channel Profile Manager",
      children: [
        { type: "text", content: "Content Format:" },
        { type: "grid", columns: "auto", children: [
            { type: "button", label: "Independent Shorts" },
            { type: "button", label: "Independent Long Form" },
            { type: "button", label: "Funnel Mode" }
          ]
        },
        { type: "text", content: "Revenue Stack:" },
        { type: "grid", columns: "auto", children: [
            { type: "button", label: "AdSense" },
            { type: "button", label: "Digital Products" },
            { type: "button", label: "Affiliate Links" }
          ]
        },
        { type: "button", label: "Generate Channel Lore", action: "API_CALL", endpoint: "/api/agents/incubate" },
        { type: "button", label: "Generate Video Script", action: "API_CALL", endpoint: "/api/agents/script" }
      ]
    };

    await adminDb.collection("dynamic_ui").doc(schemaId).set(schema);

    const analyticsSchemaId = "youtube_empire_dashboard";
    const analyticsSchema = {
      type: "card",
      title: "Empire Dashboard",
      children: [
        { type: "text", content: "Net Worth Aggregate Metrics" },
        { type: "grid", columns: "auto", children: [
            { type: "text", content: "Estimated Revenue: $1,000,000" },
            { type: "text", content: "Total Views: 50,000,000" },
            { type: "text", content: "Subscriber Growth: +10,000" }
          ]
        }
      ]
    };
    await adminDb.collection("dynamic_ui").doc(analyticsSchemaId).set(analyticsSchema);

    return Response.json({ status: "Schemas deployed successfully" });
  } catch (error) {
    logRouteError("firestore", "Schema deploy failed", error, "/api/deploy-schemas");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
