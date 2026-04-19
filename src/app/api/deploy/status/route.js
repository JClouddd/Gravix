import { NextResponse } from "next/server";
import crypto from "crypto";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
const LOCATION = process.env.GOOGLE_CLOUD_REGION || "us-east4";
const BACKEND_ID = process.env.FAH_BACKEND_ID || "gravix";

/**
 * Create a signed JWT and exchange it for a Google OAuth2 access token.
 * Uses Node.js built-in crypto — no external dependencies needed.
 */
async function getAccessToken() {
  try {
    const keyJson = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      "base64"
    ).toString();
    const key = JSON.parse(keyJson);

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const b64 = (obj) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64url");

    const unsigned = `${b64(header)}.${b64(payload)}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(unsigned);
    const signature = sign.sign(key.private_key, "base64url");

    const jwt = `${unsigned}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[deploy/status] Token exchange failed:", err);
      return null;
    }

    const tokenData = await tokenRes.json();
    return tokenData.access_token;
  } catch (err) {
    console.error("[deploy/status] Auth error:", err.message);
    return null;
  }
}

/**
 * GET /api/deploy/status — Check Firebase App Hosting build/rollout status
 *
 * Polls the Firebase App Hosting API for the latest rollouts on the
 * configured backend. Returns the most recent rollout's state so the
 * PipelineToasts component can detect build failures and successes.
 *
 * Rollout states: BUILDING, DEPLOYING, READY, FAILED
 */
export async function GET() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_SERVICE_ACCOUNT_KEY not configured", connected: false },
      { status: 500 }
    );
  }

  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json(
      { error: "Could not authenticate with Google Cloud", connected: false },
      { status: 500 }
    );
  }

  try {
    // Fetch the 5 most recent rollouts from Firebase App Hosting
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/backends/${BACKEND_ID}`;
    const url = `https://firebaseapphosting.googleapis.com/v1/${parent}/rollouts?pageSize=5&orderBy=createTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[deploy/status] App Hosting API error:", res.status, errText);

      // Fall back to Cloud Build if App Hosting API isn't accessible
      return await fallbackCloudBuild(token);
    }

    const data = await res.json();
    const rollouts = data.rollouts || [];

    if (rollouts.length === 0) {
      return NextResponse.json({
        connected: true,
        latest: null,
        message: "No rollouts found",
        checkedAt: new Date().toISOString(),
      });
    }

    // Map rollouts to a clean response
    const mapped = rollouts.map((r) => {
      const id = r.name?.split("/").pop();
      return {
        id,
        state: r.state || "UNKNOWN",
        createTime: r.createTime,
        endTime: r.endTime || null,
        buildRef: r.build || null,
        displayVersion: r.displayVersion || null,
        commitSha: r.codebase?.commit?.sha || r.codebase?.commit || null,
        commitMessage: r.codebase?.commit?.message || null,
        url: `https://console.firebase.google.com/project/${PROJECT_ID}/apphosting`,
      };
    });

    const latest = mapped[0];
    const recent = mapped.slice(1);

    const hasRecentFailure = mapped.some((r) => r.state === "FAILED");
    const latestIsHealthy = latest.state === "READY";

    return NextResponse.json({
      connected: true,
      latest,
      recent,
      hasRecentFailure,
      latestIsHealthy,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[deploy/status] Error:", err);
    return NextResponse.json(
      { error: err.message, connected: false },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Use Cloud Build API if App Hosting API is not accessible.
 * Cloud Build is the underlying system that Firebase App Hosting uses.
 */
async function fallbackCloudBuild(token) {
  try {
    const url = `https://cloudbuild.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/builds?pageSize=5`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[deploy/status] Cloud Build fallback error:", res.status, errText);
      return NextResponse.json({
        connected: false,
        error: "Could not reach App Hosting or Cloud Build APIs",
        checkedAt: new Date().toISOString(),
      });
    }

    const data = await res.json();
    return mapCloudBuilds(data.builds || []);
  } catch (err) {
    console.error("[deploy/status] Cloud Build fallback error:", err);
    return NextResponse.json({
      connected: false,
      error: err.message,
      checkedAt: new Date().toISOString(),
    });
  }
}

function mapCloudBuilds(builds) {
  if (builds.length === 0) {
    return NextResponse.json({
      connected: true,
      latest: null,
      message: "No builds found",
      source: "cloud-build",
      checkedAt: new Date().toISOString(),
    });
  }

  const mapped = builds.map((b) => ({
    id: b.id,
    state: normalizeState(b.status),
    createTime: b.createTime,
    endTime: b.finishTime || null,
    commitSha: b.substitutions?.COMMIT_SHA || b.source?.repoSource?.commitSha || null,
    logUrl: b.logUrl || null,
    url: b.logUrl || `https://console.cloud.google.com/cloud-build/builds;region=${LOCATION}/${b.id}?project=${PROJECT_ID}`,
  }));

  const latest = mapped[0];
  const hasRecentFailure = mapped.some(
    (b) => b.state === "FAILED"
  );
  const latestIsHealthy = latest.state === "READY";

  return NextResponse.json({
    connected: true,
    latest,
    recent: mapped.slice(1),
    hasRecentFailure,
    latestIsHealthy,
    source: "cloud-build",
    checkedAt: new Date().toISOString(),
  });
}

/**
 * Normalize Cloud Build status names to App Hosting convention
 */
function normalizeState(status) {
  switch (status) {
    case "SUCCESS":
      return "READY";
    case "FAILURE":
    case "TIMEOUT":
    case "INTERNAL_ERROR":
      return "FAILED";
    case "WORKING":
      return "BUILDING";
    case "QUEUED":
      return "QUEUED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return status || "UNKNOWN";
  }
}
