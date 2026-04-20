import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/errors/history
 * Retrieve error history with filtering.
 * Query params: source, severity, status, days (default 7)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const days = parseInt(searchParams.get("days") || "7", 10);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString();

    let query = adminDb
      .collection("system_errors")
      .where("createdAt", ">=", cutoffISO)
      .orderBy("createdAt", "desc")
      .limit(200);

    const snapshot = await query.get();

    let errors = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Apply client-side filters (Firestore only supports one inequality filter)
      if (source && data.source !== source) return;
      if (severity && data.severity !== severity) return;
      if (status && data.status !== status) return;

      errors.push({ id: doc.id, ...data });
    });

    // Compute stats
    const stats = {
      total: errors.length,
      open: errors.filter((e) => e.status === "open").length,
      resolved: errors.filter((e) => e.status === "resolved").length,
      bySource: {},
      bySeverity: { error: 0, warning: 0, info: 0 },
    };

    errors.forEach((e) => {
      stats.bySource[e.source] = (stats.bySource[e.source] || 0) + 1;
      if (stats.bySeverity[e.severity] !== undefined) {
        stats.bySeverity[e.severity]++;
      }
    });

    return NextResponse.json({ errors, stats });
  } catch (error) {
    console.error("Error fetching error history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/errors/history
 * Update error status (resolve, add diagnosis, etc.)
 * Body: { id, status?, diagnosis? }
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, diagnosis } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolvedAt = new Date().toISOString();
      }
    }
    if (diagnosis) {
      updateData.diagnosis = diagnosis;
    }

    await adminDb.collection("system_errors").doc(id).update(updateData);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error updating error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
