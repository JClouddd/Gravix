import { synthesizeSpeech } from "@/lib/googleTTS";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/tts
 * Generates Text-to-Speech audio using Google Cloud TTS
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { text, voiceModel } = body;

    if (!text || typeof text !== "string") {
      return Response.json({ error: "text is required and must be a string" }, { status: 400 });
    }

    const audioBase64 = await synthesizeSpeech(text, voiceModel);

    return Response.json({
      audioContent: audioBase64
    });
  } catch (error) {
    console.error("[/api/tts]", error);
    logRouteError("tts", "/api/tts error", error, "/api/tts");

    return Response.json(
      { error: error.message || "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
