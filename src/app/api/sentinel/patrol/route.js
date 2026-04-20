import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { listSessions } from "@/lib/julesClient";
import { logRouteError } from "@/lib/errorLogger";

async function runHealthSweep() {
  const services = [];
  const startSweep = Date.now();

  const checkService = async (name, checkFn) => {
    const startTime = Date.now();
    try {
      await checkFn();
      const latencyMs = Date.now() - startTime;
      services.push({
        name,
        status: "healthy",
        latencyMs,
        error: null,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      services.push({
        name,
        status: "down",
        latencyMs,
        error: error.message || String(error),
        checkedAt: new Date().toISOString()
      });
    }
  };

  await Promise.all([
    checkService("Firebase", async () => {
      await adminDb.collection("system_errors").limit(1).get();
    }),
    checkService("GitHub", async () => {
      const response = await fetch("https://api.github.com/repos/JClouddd/Gravix", {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN || ''}`,
          "User-Agent": "Gravix-Sentinel"
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }
    }),
    checkService("Gemini", async () => {
      await generate({ prompt: "ping", complexity: "low" });
    }),
    checkService("Jules", async () => {
      await listSessions();
    })
  ]);

  const duration = Date.now() - startSweep;
  return { services, duration };
}

export async function GET(req) {
  try {
    const { services } = await runHealthSweep();
    return Response.json({ services, timestamp: new Date().toISOString() });
  } catch (error) {
    await logRouteError("sentinel", "Patrol GET failed", error, "/api/sentinel/patrol");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { services, duration } = await runHealthSweep();

    const lastPatrolSnapshot = await adminDb
      .collection("sentinel_patrols")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    let issues = [];
    let resolvedSince = [];

    if (!lastPatrolSnapshot.empty) {
      const lastPatrol = lastPatrolSnapshot.docs[0].data();
      const lastServices = lastPatrol.services || [];

      for (const current of services) {
        const previous = lastServices.find(s => s.name === current.name);
        if (previous) {
          if (previous.status === "healthy" && (current.status === "degraded" || current.status === "down")) {
            issues.push(current.name);
          } else if ((previous.status === "degraded" || previous.status === "down") && current.status === "healthy") {
            resolvedSince.push(current.name);
          }
        } else if (current.status === "degraded" || current.status === "down") {
          issues.push(current.name);
        }
      }
    } else {
      for (const current of services) {
        if (current.status === "degraded" || current.status === "down") {
          issues.push(current.name);
        }
      }
    }

    const report = {
      services,
      issues,
      resolvedSince,
      duration,
      createdAt: new Date().toISOString()
    };

    await adminDb.collection("sentinel_patrols").add(report);

    return Response.json(report);
  } catch (error) {
    await logRouteError("sentinel", "Patrol POST failed", error, "/api/sentinel/patrol");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
