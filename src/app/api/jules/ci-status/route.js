import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/jules/ci-status — Fetch latest GitHub Actions CI status
 *
 * Returns the most recent CI run status for the main branch and
 * any open PR branches, so the Pipeline Monitor can detect failures.
 */
export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "JClouddd/Gravix";

  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Fetch latest workflow runs (CI + Jules Auto Merge)
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=10&status=completed`,
      { headers, next: { revalidate: 30 } }
    );

    if (!runsRes.ok) {
      const text = await runsRes.text();
      return NextResponse.json(
        { error: "GitHub API error", details: text },
        { status: runsRes.status }
      );
    }

    const runsData = await runsRes.json();
    const runs = runsData.workflow_runs || [];

    // Find the latest CI run on main
    const mainCi = runs.find(
      (r) => r.head_branch === "main" && r.name === "CI"
    );

    // Find any failing PR CI runs
    const failingPrRuns = runs
      .filter(
        (r) =>
          r.head_branch !== "main" &&
          r.name === "CI" &&
          r.conclusion === "failure"
      )
      .slice(0, 5)
      .map((r) => ({
        branch: r.head_branch,
        sha: r.head_sha,
        conclusion: r.conclusion,
        url: r.html_url,
        updatedAt: r.updated_at,
      }));

    // Also fetch open PRs for context
    const prsRes = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=10`,
      { headers, next: { revalidate: 60 } }
    );

    let openPrs = [];
    if (prsRes.ok) {
      const prsData = await prsRes.json();
      openPrs = prsData.map((pr) => ({
        number: pr.number,
        title: pr.title,
        branch: pr.head.ref,
        author: pr.user.login,
        updatedAt: pr.updated_at,
      }));
    }

    return NextResponse.json({
      main: mainCi
        ? {
            status: mainCi.status,
            conclusion: mainCi.conclusion,
            sha: mainCi.head_sha,
            branch: "main",
            url: mainCi.html_url,
            updatedAt: mainCi.updated_at,
          }
        : null,
      failingPrRuns,
      openPrs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("CI status fetch error:", err);
    logRouteError("jules", "/api/jules/ci-status error", err, "/api/jules/ci-status");
    return NextResponse.json(
      { error: "Failed to fetch CI status", message: err.message },
      { status: 500 }
    );
  }
}
