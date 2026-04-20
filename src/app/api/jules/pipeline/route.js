import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/jules/pipeline — Create a multi-wave build pipeline
 * GET  /api/jules/pipeline — Check pipeline status
 * PATCH /api/jules/pipeline — Manual controls (pause, resume, skip-wave, retry-task)
 *
 * Pipeline state machine:
 *   running → merging → completed
 *                ↓
 *             paused (manual or auto on failure)
 *
 * Wave state machine:
 *   pending → running → merging → completed
 *                         ↓
 *                       failed
 *
 * Task state machine:
 *   pending → triggered → completed → pr_merged
 *                ↓
 *             failed → diagnosing → fix_triggered → (completed | failed_final)
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://gravix--antigravity-hub-jcloud.us-east4.hosted.app";

// ── POST: Create Pipeline ────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, waves, autoApprove = true } = body;

    if (!name || !Array.isArray(waves) || waves.length === 0) {
      return Response.json(
        { error: "name (string) and waves (array of {tasks: [...]}) are required" },
        { status: 400 }
      );
    }

    // Validate wave structure
    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      if (!Array.isArray(wave.tasks) || wave.tasks.length === 0) {
        return Response.json(
          { error: `Wave ${i} must have a non-empty tasks array` },
          { status: 400 }
        );
      }
      for (let j = 0; j < wave.tasks.length; j++) {
        const task = wave.tasks[j];
        if (!task.prompt || !task.title) {
          return Response.json(
            { error: `Wave ${i}, Task ${j} must have prompt and title` },
            { status: 400 }
          );
        }
      }
    }

    // Build pipeline document
    const pipeline = {
      name,
      status: "running",
      currentWave: 0,
      totalWaves: waves.length,
      waves: waves.map((wave, i) => ({
        waveNumber: i,
        status: i === 0 ? "running" : "pending",
        mergeCheckStartedAt: null,
        triggeredAt: i === 0 ? new Date().toISOString() : null,
        completedAt: null,
        tasks: wave.tasks.map((task) => ({
          title: task.title,
          prompt: task.prompt,
          files: task.files || [],
          fileLocks: task.fileLocks || [],
          acceptanceCriteria: task.acceptanceCriteria || "",
          autoApprove: task.autoApprove ?? autoApprove,
          status: "pending",
          sessionId: null,
          error: null,
          triggeredAt: null,
          completedAt: null,
        })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Firestore
    const db = adminDb;
    const docRef = await db.collection("jules_pipelines").add(pipeline);
    const pipelineId = docRef.id;

    // Trigger Wave 0 tasks
    const triggerResults = [];
    for (let i = 0; i < pipeline.waves[0].tasks.length; i++) {
      const task = pipeline.waves[0].tasks[i];
      try {
        const res = await fetch(`${BASE_URL}/api/jules/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: task.prompt,
            title: task.title,
            files: task.files,
            fileLocks: task.fileLocks,
            autoApprove: task.autoApprove,
            acceptanceCriteria: task.acceptanceCriteria,
            _pipelineId: pipelineId,
            _waveNumber: 0,
          }),
        });

        const result = await res.json();
        triggerResults.push({ title: task.title, success: result.success, sessionId: result.sessionId, queued: result.queued });

        if (result.success && result.sessionId) {
          pipeline.waves[0].tasks[i].sessionId = result.sessionId.replace("sessions/", "");
          pipeline.waves[0].tasks[i].status = "triggered";
          pipeline.waves[0].tasks[i].triggeredAt = new Date().toISOString();
        } else if (result.queued) {
          pipeline.waves[0].tasks[i].status = "triggered";
          pipeline.waves[0].tasks[i].triggeredAt = new Date().toISOString();
          pipeline.waves[0].tasks[i].sessionId = `queued:${result.queueId}`;
        }
      } catch (err) {
        pipeline.waves[0].tasks[i].status = "failed";
        pipeline.waves[0].tasks[i].error = err.message;
        triggerResults.push({ title: task.title, success: false, error: err.message });
      }
    }

    // Update pipeline with session IDs
    await docRef.update({
      waves: pipeline.waves,
      updatedAt: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      pipelineId,
      name,
      totalWaves: waves.length,
      currentWave: 0,
      wave0Results: triggerResults,
      message: `Pipeline created. Wave 1 of ${waves.length} triggered with ${pipeline.waves[0].tasks.length} task(s). Monitor will advance automatically.`,
    });
  } catch (err) {
    console.error("[/api/jules/pipeline POST]", err);
    logRouteError?.("jules", "/api/jules/pipeline POST error", err, "/api/jules/pipeline");
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── GET: Check Pipeline Status ───────────────────────────────
export async function GET(request) {
  try {
    const db = adminDb;
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("id");

    if (pipelineId) {
      const doc = await db.collection("jules_pipelines").doc(pipelineId).get();
      if (!doc.exists) {
        return Response.json({ error: "Pipeline not found" }, { status: 404 });
      }

      const data = doc.data();

      // Build a summary view
      const waveSummary = data.waves.map((w) => ({
        wave: w.waveNumber + 1,
        status: w.status,
        tasks: w.tasks.length,
        completed: w.tasks.filter((t) => t.status === "completed" || t.status === "pr_merged").length,
        failed: w.tasks.filter((t) => t.status === "failed" || t.status === "failed_final").length,
      }));

      return Response.json({
        pipeline: { id: doc.id, ...data },
        summary: {
          name: data.name,
          status: data.status,
          currentWave: data.currentWave + 1,
          totalWaves: data.totalWaves,
          waves: waveSummary,
        },
      });
    }

    // List all pipelines
    const snapshot = await db
      .collection("jules_pipelines")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const pipelines = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        status: data.status,
        currentWave: data.currentWave + 1,
        totalWaves: data.totalWaves,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return Response.json({ pipelines });
  } catch (err) {
    console.error("[/api/jules/pipeline GET]", err);
    logRouteError?.("jules", "/api/jules/pipeline GET error", err, "/api/jules/pipeline");
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Manual Controls ───────────────────────────────────
export async function PATCH(request) {
  try {
    const db = adminDb;
    const { id, action, taskIndex, waveNumber } = await request.json();

    if (!id || !action) {
      return Response.json({ error: "id and action are required" }, { status: 400 });
    }

    const docRef = db.collection("jules_pipelines").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return Response.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const pipeline = doc.data();
    let detail = "";

    switch (action) {
      case "pause": {
        pipeline.status = "paused";
        detail = "Pipeline paused. No new waves will be triggered.";
        break;
      }

      case "resume": {
        pipeline.status = "running";
        detail = "Pipeline resumed. Next monitor cycle will check for advancement.";
        break;
      }

      case "skip-wave": {
        const current = pipeline.currentWave;
        if (current + 1 >= pipeline.totalWaves) {
          return Response.json({ error: "Already on the last wave" }, { status: 400 });
        }
        pipeline.waves[current].status = "completed";
        pipeline.waves[current].completedAt = new Date().toISOString();
        pipeline.currentWave = current + 1;
        detail = `Skipped wave ${current + 1}. Now on wave ${current + 2}.`;

        // Trigger next wave
        const nextWave = pipeline.waves[pipeline.currentWave];
        nextWave.status = "running";
        nextWave.triggeredAt = new Date().toISOString();

        for (let i = 0; i < nextWave.tasks.length; i++) {
          try {
            const res = await fetch(`${BASE_URL}/api/jules/trigger`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: nextWave.tasks[i].prompt,
                title: nextWave.tasks[i].title,
                files: nextWave.tasks[i].files,
                fileLocks: nextWave.tasks[i].fileLocks,
                autoApprove: nextWave.tasks[i].autoApprove,
                acceptanceCriteria: nextWave.tasks[i].acceptanceCriteria,
                _pipelineId: id,
                _waveNumber: pipeline.currentWave,
              }),
            });
            const result = await res.json();
            if (result.sessionId) {
              nextWave.tasks[i].sessionId = result.sessionId.replace("sessions/", "");
              nextWave.tasks[i].status = "triggered";
              nextWave.tasks[i].triggeredAt = new Date().toISOString();
            }
          } catch (trigErr) {
            nextWave.tasks[i].status = "failed";
            nextWave.tasks[i].error = trigErr.message;
          }
        }
        break;
      }

      case "retry-task": {
        const waveIdx = waveNumber ?? pipeline.currentWave;
        const wave = pipeline.waves[waveIdx];
        if (!wave || taskIndex == null || !wave.tasks[taskIndex]) {
          return Response.json({ error: "Invalid waveNumber or taskIndex" }, { status: 400 });
        }

        const task = wave.tasks[taskIndex];
        task.status = "pending";
        task.error = null;
        task.sessionId = null;

        try {
          const res = await fetch(`${BASE_URL}/api/jules/trigger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: task.prompt,
              title: `[Retry] ${task.title}`,
              files: task.files,
              fileLocks: task.fileLocks,
              autoApprove: task.autoApprove,
              acceptanceCriteria: task.acceptanceCriteria,
              _pipelineId: id,
              _waveNumber: waveIdx,
            }),
          });
          const result = await res.json();
          if (result.sessionId) {
            task.sessionId = result.sessionId.replace("sessions/", "");
            task.status = "triggered";
            task.triggeredAt = new Date().toISOString();
          }
          detail = `Task "${task.title}" retried. New session: ${task.sessionId}`;
        } catch (retryErr) {
          task.status = "failed";
          task.error = retryErr.message;
          detail = `Retry failed: ${retryErr.message}`;
        }
        break;
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    pipeline.updatedAt = new Date().toISOString();
    await docRef.update(pipeline);

    return Response.json({ success: true, action, detail, pipeline: { id, ...pipeline } });
  } catch (err) {
    console.error("[/api/jules/pipeline PATCH]", err);
    logRouteError?.("jules", "/api/jules/pipeline PATCH error", err, "/api/jules/pipeline");
    return Response.json({ error: err.message }, { status: 500 });
  }
}
