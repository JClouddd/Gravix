import { synthesizeSpeech } from "@/lib/googleTTS";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { script } = await request.json();

    if (!script) {
      return Response.json(
        { success: false, error: "Missing 'script' in request body" },
        { status: 400 }
      );
    }

    const audioContent = await synthesizeSpeech(script);

    return Response.json({
      success: true,
      audioContent
    });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Audio API Error",
      error,
      "/api/youtube/audio"
    );

    return Response.json(
      { success: false, error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
