import { logRouteError } from "@/lib/errorLogger";
import { synthesizeSpeech } from "@/lib/googleTTS";

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

    if (provider === "tts") {
      if (!prompt) {
         return Response.json({ error: "Missing 'prompt' (script) for TTS provider." }, { status: 400 });
      }
      const audioContent = await synthesizeSpeech(prompt);
      return Response.json({
        success: true,
        provider,
        audioContent
      });
    }

    // Mock dispatching logic for veo and lyria
    return Response.json({
      success: true,
      provider,
      jobId: `mock-job-${Date.now()}`,
      status: "queued"
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
