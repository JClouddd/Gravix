import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/colab/notebooks/merge
 * Merge two notebooks into one. Combines raw content, updates analysis prompt,
 * and deactivates the source notebook.
 *
 * Body: { targetId: string, sourceId: string }
 */
export async function POST(request) {
  try {
    const { targetId, sourceId } = await request.json();

    if (!targetId || !sourceId) {
      return Response.json({ error: "targetId and sourceId are required" }, { status: 400 });
    }

    if (targetId === sourceId) {
      return Response.json({ error: "Cannot merge a notebook into itself" }, { status: 400 });
    }

    // Fetch both notebooks
    const [targetDoc, sourceDoc] = await Promise.all([
      adminDb.collection("notebooks").doc(targetId).get(),
      adminDb.collection("notebooks").doc(sourceId).get(),
    ]);

    if (!targetDoc.exists) {
      return Response.json({ error: `Target notebook ${targetId} not found` }, { status: 404 });
    }
    if (!sourceDoc.exists) {
      return Response.json({ error: `Source notebook ${sourceId} not found` }, { status: 404 });
    }

    const target = targetDoc.data();
    const source = sourceDoc.data();

    // Merge content
    const mergedContent = [
      target.rawContent || "",
      "\n\n--- MERGED FROM: " + (source.name || source.sourceTitle || sourceId) + " ---\n\n",
      source.rawContent || "",
    ].join("");

    // Merge tags (deduplicated)
    const targetTags = target.classification?.tags || [];
    const sourceTags = source.classification?.tags || [];
    const mergedTags = [...new Set([...targetTags, ...sourceTags])];

    // Merge tools referenced
    const mergedTools = [...new Set([
      ...(target.toolsReferenced || []),
      ...(source.toolsReferenced || []),
    ])];

    // Merge Google mappings
    const existingMappings = target.googleMapping || [];
    const newMappings = (source.googleMapping || []).filter(
      m => !existingMappings.some(em => em.source_tool === m.source_tool)
    );
    const mergedMappings = [...existingMappings, ...newMappings];

    // Merge applicable agents
    const mergedAgents = [...new Set([
      ...(target.applicableAgents || []),
      ...(source.applicableAgents || []),
    ])];

    // Update the target notebook
    await adminDb.collection("notebooks").doc(targetId).update({
      name: target.name + " (merged)",
      rawContent: mergedContent,
      rawContentLength: mergedContent.length,
      "classification.tags": mergedTags,
      toolsReferenced: mergedTools,
      googleMapping: mergedMappings,
      applicableAgents: mergedAgents,
      analysisPrompt: target.analysisPrompt + "\n\nAdditional context merged from: " + (source.name || sourceId) + "\n" + (source.analysisPrompt || ""),
      mergedFrom: FieldValue.arrayUnion(sourceId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Mark the source notebook as merged (soft delete)
    await adminDb.collection("notebooks").doc(sourceId).update({
      status: "merged",
      mergedInto: targetId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({
      success: true,
      targetId,
      sourceId,
      mergedTags: mergedTags.length,
      mergedTools: mergedTools.length,
      mergedMappings: mergedMappings.length,
      message: `Merged "${source.name}" into "${target.name}". Source notebook archived.`,
    });
  } catch (error) {
    console.error("[/api/colab/notebooks/merge]", error);
    logRouteError("colab", "/api/colab/notebooks/merge error", error, "/api/colab/notebooks/merge");
    return Response.json(
      { error: error.message || "Merge failed" },
      { status: 500 }
    );
  }
}
