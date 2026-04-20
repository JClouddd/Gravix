import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/colab/notebooks/approve
 * Approve or reject a pending notebook.
 * Body: { notebookId, action: "approve" | "reject" }
 * 
 * GET /api/colab/notebooks/approve?id=xxx
 * Get the FULL raw content of a pending notebook for review.
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id query parameter is required" }, { status: 400 });
  }

  try {
    const doc = await adminDb.collection("notebooks").doc(id).get();
    if (!doc.exists) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }

    const data = doc.data();

    // Return FULL unabridged content for review
    return Response.json({
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      analysisPrompt: data.analysisPrompt,
      parameters: data.parameters,
      expectedOutputs: data.expectedOutputs,
      estimatedCost: data.estimatedCost,
      sourceTitle: data.sourceTitle,
      sourceType: data.sourceType,
      sourceEntryId: data.sourceEntryId,
      classification: data.classification,
      // FULL raw content — not summarized, not truncated
      rawContent: data.rawContent,
      rawContentLength: data.rawContentLength,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    });
  } catch (err) {
    logRouteError("colab", "/api/colab/notebooks/approve error", err, "/api/colab/notebooks/approve");
      return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { notebookId, action } = body;

    if (!notebookId || !action) {
      return Response.json({ error: "notebookId and action are required" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return Response.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const docRef = adminDb.collection("notebooks").doc(notebookId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }

    if (action === "approve") {
      await docRef.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
      });

      // Update knowledge stats
      await adminDb.collection("system").doc("knowledge_stats").set(
        { notebooksApproved: FieldValue.increment(1) },
        { merge: true }
      );

      return Response.json({
        success: true,
        message: `Notebook "${doc.data().name}" approved and now available in Colab.`,
      });
    } else {
      await docRef.update({
        status: "rejected",
        rejectedAt: FieldValue.serverTimestamp(),
      });

      return Response.json({
        success: true,
        message: `Notebook "${doc.data().name}" rejected.`,
      });
    }
  } catch (err) {
    logRouteError("colab", "/api/colab/notebooks/approve error", err, "/api/colab/notebooks/approve");
      return Response.json({ error: err.message }, { status: 500 });
  }
}
