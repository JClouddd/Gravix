import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const data = await request.json();
    const { provider, prompt } = data;

    const validProviders = ["veo", "lyria", "tts"];

    if (!provider || !validProviders.includes(provider)) {
      return Response.json(
        { error: "Missing or invalid provider. Valid options are: veo, lyria, tts." },
        { status: 400 }
      );
    }

    // Mock dispatching logic
    return Response.json({
      success: true,
      provider,
      jobId: `mock-job-${Date.now()}`,
    });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Dispatch API Error",
      error,
      "/api/youtube/dispatch"
    );
    return Response.json(
      { error: "Failed to dispatch job" },
      { status: 500 }
    );
  }
}
