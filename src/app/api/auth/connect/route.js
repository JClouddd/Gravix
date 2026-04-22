import { getAuthUrl } from "@/lib/googleAuth";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/auth/connect
 * Redirects user to Google OAuth consent screen
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app";
    const redirectUri = `${origin}/api/auth/callback`;

    const authUrl = getAuthUrl(redirectUri);
    return Response.redirect(authUrl, 302);
  } catch (error) {
    logRouteError("firebase_auth", "/api/auth/connect error", error, "/api/auth/connect");
      // If OAuth isn't configured yet, return a helpful error
    return Response.json({
      error: "OAuth not configured",
      message: error.message,
      setup: {
        step1: "Go to https://console.cloud.google.com/apis/credentials?project=antigravity-hub-jcloud",
        step2: "Configure OAuth consent screen (External, test mode)",
        step3: "Create OAuth 2.0 Client ID (Web application)",
        step4: "Add authorized redirect URI: https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/auth/callback",
        step5: "Set env vars in Firebase App Hosting: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET",
      },
    }, { status: 501 });
  }
}
