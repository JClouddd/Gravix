import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const trends = ["AI Agents", "Next.js 15", "Quantum Computing"];
    return Response.json({ trends });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Trends API Error",
      error,
      "/api/youtube/trends"
    );
    return Response.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
