import { searchContacts, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/contacts/search?q=...
 * Searches contacts via Google People API
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q) {
      return Response.json({ results: [] });
    }

    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({ error: "Not connected to Google OAuth" }, { status: 401 });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;

      await adminDb.collection("settings").doc("google_oauth").update({
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    }

    const data = await searchContacts(accessToken, q);

    // Google People API search results are in `results`, and the person object is inside `person` property of each result
    return Response.json({
      results: data.results || [],
    });
  } catch (error) {
    console.error("[/api/contacts/search GET]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
