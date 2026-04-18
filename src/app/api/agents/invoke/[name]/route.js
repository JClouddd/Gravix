import { routeToAgent, listAgentTools } from "@/lib/agentEngine";

export async function POST(request, { params }) {
  try {
    const { name } = params;
    const body = await request.json();
    const { message, context = {} } = body;

    if (!message) {
      return Response.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const response = await routeToAgent(message, name, context);
    return Response.json(response);
  } catch (error) {
    console.error(`[/api/agents/invoke/${params.name}]`, error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { name } = params;
    const tools = await listAgentTools(name);

    return Response.json({
      agent: name,
      tools
    });
  } catch (error) {
    console.error(`[/api/agents/invoke/${params.name}] GET`, error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
