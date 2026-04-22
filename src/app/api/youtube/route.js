import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const data = await request.json();
    const { accessToken } = data;

    if (!accessToken) {
      return Response.json({ error: "Missing accessToken" }, { status: 400 });
    }

    return Response.json({ status: "YouTube API ready" });
  } catch (error) {
    logRouteError(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
