import { pipelineRegistry, triggerPipeline } from "@/lib/automationEngine";

export async function POST(request) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event) {
      return Response.json({ error: "Missing 'event' in request body." }, { status: 400 });
    }

    if (!pipelineRegistry[event]) {
      return Response.json({ error: `Event '${event}' not found in pipeline registry.` }, { status: 400 });
    }

    const results = await triggerPipeline(event, data);

    return Response.json({
      event,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/automation/trigger]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
