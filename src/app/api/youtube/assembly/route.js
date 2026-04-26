import { logRouteError } from "@/lib/errorLogger";
import { stitchVideos } from "@/lib/workers/ffmpegWorker";
import path from "path";

export async function POST(request) {
  try {
    const data = await request.json();
    const { assets } = data;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return Response.json(
        { error: "Missing or invalid assets array." },
        { status: 400 }
      );
    }

    const assemblyId = `assembly-${Date.now()}`;
    const outputPath = path.join("/tmp", `${assemblyId}.mp4`);

    try {
      const finalVideoPath = await stitchVideos(assets, outputPath);

      return Response.json({
        success: true,
        assemblyId,
        status: "completed",
        outputPath: finalVideoPath
      });
    } catch (ffmpegError) {
      throw new Error(`FFmpeg processing failed: ${ffmpegError.message}`);
    }

  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Assembly Worker API Error",
      error,
      "/api/youtube/assembly"
    );
    return Response.json(
      { error: "Failed to queue assembly job" },
      { status: 500 }
    );
  }
}
