import { generateMasterScript } from "@/lib/youtube/masterScript";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, audience } = body;

    if (!topic) {
      return Response.json(
        { success: false, error: "Missing required field: topic" },
        { status: 400 }
      );
    }

    const scriptData = await generateMasterScript(topic, audience);

    return Response.json({
      success: true,
      data: scriptData
    });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Master Script Incubation Error",
      error,
      "/api/youtube/incubation"
    );

    return Response.json(
      { success: false, error: "Failed to generate master script" },
      { status: 500 }
    );
  }
}
