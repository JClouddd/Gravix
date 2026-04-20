import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { listSessions } from "@/lib/julesClient";
import { logRouteError } from "@/lib/errorLogger";

async function runHealthChecks() {
  const services = [];

  // 1. Firebase
  const fbStart = Date.now();
  try {
    // Attempt a simple read. We'll just read from a system collection and limit to 1
    await adminDb.collection("system_errors").limit(1).get();
    services.push({
      name: "firebase",
      status: "healthy",
      latencyMs: Date.now() - fbStart,
      error: null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    services.push({
      name: "firebase",
      status: "down",
      latencyMs: Date.now() - fbStart,
      error: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  // 2. GitHub
  const ghStart = Date.now();
  try {
    const ghRes = await fetch("https://api.github.com/repos/JClouddd/Gravix", {
      headers: {
        "Authorization": process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN}` : "",
        "User-Agent": "Gravix-Sentinel",
        "Accept": "application/vnd.github.v3+json",
      },
    });
    if (ghRes.ok) {
      services.push({
        name: "github",
        status: "healthy",
        latencyMs: Date.now() - ghStart,
        error: null,
        checkedAt: new Date().toISOString(),
      });
    } else {
      services.push({
        name: "github",
        status: "degraded",
        latencyMs: Date.now() - ghStart,
        error: `HTTP ${ghRes.status} ${ghRes.statusText}`,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    services.push({
      name: "github",
      status: "down",
      latencyMs: Date.now() - ghStart,
      error: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  // 3. Gemini
  const gemStart = Date.now();
  try {
    await generate({ prompt: "ping", maxTokens: 10 });
    services.push({
      name: "gemini",
      status: "healthy",
      latencyMs: Date.now() - gemStart,
      error: null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    services.push({
      name: "gemini",
      status: "down",
      latencyMs: Date.now() - gemStart,
      error: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  // 4. Jules
  const julesStart = Date.now();
  try {
    await listSessions();
    services.push({
      name: "jules",
      status: "healthy",
      latencyMs: Date.now() - julesStart,
      error: null,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    services.push({
      name: "jules",
      status: "down",
      latencyMs: Date.now() - julesStart,
      error: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  return services;
}

export async function GET(request) {
  try {
    const services = await runHealthChecks();
    return Response.json({ services, timestamp: new Date().toISOString() });
  } catch (err) {
    await logRouteError("runtime", "Sentinel Patrol GET Failed", err, "/api/sentinel/patrol");
    return Response.json({ error: "Patrol sweep failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const startMs = Date.now();
    const services = await runHealthChecks();

    // Fetch last patrol
    const patrolsSnapshot = await adminDb.collection("sentinel_patrols")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    const issues = [];
    const resolvedSince = [];

    if (!patrolsSnapshot.empty) {
      const lastPatrol = patrolsSnapshot.docs[0].data();
      const lastServices = lastPatrol.services || [];

      // Compare
      for (const service of services) {
        const lastService = lastServices.find((s) => s.name === service.name);
        if (lastService) {
          if (lastService.status === "healthy" && (service.status === "degraded" || service.status === "down")) {
            issues.push({ service: service.name, status: service.status, error: service.error });
          } else if ((lastService.status === "degraded" || lastService.status === "down") && service.status === "healthy") {
            resolvedSince.push({ service: service.name });
          }
        } else {
           if(service.status === "degraded" || service.status === "down") {
               issues.push({ service: service.name, status: service.status, error: service.error });
           }
        }
      }
    } else {
      // First patrol
      for (const service of services) {
        if (service.status === "degraded" || service.status === "down") {
          issues.push({ service: service.name, status: service.status, error: service.error });
        }
      }
    }

    const duration = Date.now() - startMs;
    const createdAt = new Date().toISOString();

    const report = {
      services,
      issues,
      resolvedSince,
      duration,
      createdAt,
    };

    await adminDb.collection("sentinel_patrols").add(report);

    return Response.json(report);
  } catch (err) {
    await logRouteError("runtime", "Sentinel Patrol POST Failed", err, "/api/sentinel/patrol");
    return Response.json({ error: "Patrol sweep and store failed" }, { status: 500 });
  }
}
