import { listCalendars, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/calendar/list — Returns all calendars the user has access to
 * Each calendar includes: id, summary (name), colorId, backgroundColor, primary flag
 */
export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ connected: false, calendars: [] });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    // Refresh token if expired
    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;
        await adminDb.collection("settings").doc("google_oauth").update({
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch {
        return Response.json({
          connected: false,
          calendars: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    const data = await listCalendars(accessToken);
    const calendars = (data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary || cal.summaryOverride || "Unnamed Calendar",
      description: cal.description || "",
      backgroundColor: cal.backgroundColor || "#4285f4",
      foregroundColor: cal.foregroundColor || "#ffffff",
      primary: cal.primary || false,
      accessRole: cal.accessRole || "reader",
      selected: cal.selected !== false,
    }));

    return Response.json({ connected: true, calendars });
  } catch (error) {
    console.error("[/api/calendar/list]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
