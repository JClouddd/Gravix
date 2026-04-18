import { exchangeCode } from "@/lib/googleAuth";

import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/auth/callback
 * Google OAuth callback — exchanges auth code for tokens and stores them
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      return redirectWithMessage("error", `OAuth denied: ${error}`);
    }

    if (!code) {
      return redirectWithMessage("error", "No auth code received");
    }

    if (state !== "gravix_oauth") {
      return redirectWithMessage("error", "Invalid OAuth state");
    }

    // Exchange the code for tokens
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/callback`;
    const tokens = await exchangeCode(code, redirectUri);

    // Store tokens in Firestore (will be encrypted at rest by Firebase)
    await adminDb.collection("settings").doc("google_oauth").set( {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      connectedAt: new Date().toISOString(),
    }, { merge: true });

    return redirectWithMessage("success", "Google Workspace connected successfully!");
  } catch (err) {
    console.error("[/api/auth/callback]", err);
    return redirectWithMessage("error", err.message);
  }
}

function redirectWithMessage(status, message) {
  const url = new URL("https://gravix-eight.vercel.app");
  url.searchParams.set("auth", status);
  url.searchParams.set("message", message);
  return Response.redirect(url.toString(), 302);
}
