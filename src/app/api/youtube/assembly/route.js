import { logRouteError } from "@/lib/errorLogger";
import { stitchVideos } from "@/lib/workers/ffmpegWorker";
import path from "path";
import { after } from "next/server";

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
    const outputFile = path.join("/tmp", `${assemblyId}.mp4`);

    // In a real environment, we might want to return immediately and run this in the background
    // but the task says "queue the stitchVideos function", so we kick it off.
    // We use after() to prevent Cloud Run from throttling the CPU before FFmpeg finishes.
    after(async () => {
      try {
        await stitchVideos(assets, outputFile);
      } catch (err) {
        await logRouteError("youtube", "FFmpeg Assembly Background Error", err, "/api/youtube/assembly");
      }
    });

    return Response.json({
      success: true,
      assemblyId,
      status: "queued",
      outputFile
    });
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
