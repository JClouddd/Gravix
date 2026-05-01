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
        return Response.json(
          { error: "Missing prompt for tts provider." },
          { status: 400 }
        );
      }
      const audioContent = await synthesizeSpeech(prompt);
      return Response.json({
        success: true,
        provider,
        jobId: `tts-job-${Date.now()}`,
        audioContent
      });
    }

    if (provider === "veo") {
      // Stub for Veo 3 (Video Generation) provider integration
      // Expected payload might include complex scenes or prompts
      return Response.json({
        success: true,
        provider,
        jobId: `veo-job-${Date.now()}`,
        status: "processing_video"
      });
    }

    if (provider === "lyria") {
      // Stub for Lyria (Music/Audio Generation) provider integration
      return Response.json({
        success: true,
        provider,
        jobId: `lyria-job-${Date.now()}`,
        status: "processing_audio"
      });
    }

    return Response.json({ error: "Provider not fully implemented." }, { status: 501 });
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
