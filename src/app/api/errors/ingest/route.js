import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const VALID_SOURCES = [
  "firebase_deploy", "firebase_auth", "firestore",
  "cloud_functions", "github_ci", "jules",
  "gmail", "calendar", "tasks", "meet",
  "youtube", "gemini", "discovery", "colab",
  "runtime", "agent"
];

const VALID_SEVERITIES = ["error", "warning", "info"];

/**
 * POST /api/errors/ingest
 * Central endpoint for persisting errors from all sources.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { source, severity, title, message, context } = body;

    if (!source || !title) {
      return NextResponse.json(
        { error: "source and title are required" },
        { status: 400 }
      );
    }

    const errorDoc = {
      source: VALID_SOURCES.includes(source) ? source : "runtime",
      severity: VALID_SEVERITIES.includes(severity) ? severity : "error",
      title: String(title).slice(0, 200),
      message: String(message || "").slice(0, 2000),
      context: context || {},
      status: "open",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      diagnosis: null,
    };

    const docRef = await adminDb.collection("system_errors").add(errorDoc);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      source: errorDoc.source,
      severity: errorDoc.severity,
    });
  } catch (error) {
    console.error("Error ingesting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
