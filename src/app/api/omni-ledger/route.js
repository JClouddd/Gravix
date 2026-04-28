import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/omni-ledger
 * Fetches the three core persistent documents: plan_status, video_status, and daily_context.
 */
export async function GET() {
  try {
    const ledgerRef = adminDb.collection("omni_ledger");
    
    // Fetch all three docs in parallel
    const [planDoc, videoDoc, contextDoc] = await Promise.all([
      ledgerRef.doc("plan_status").get(),
      ledgerRef.doc("video_status").get(),
      ledgerRef.doc("daily_context").get()
    ]);

    return NextResponse.json({
      plan_status: planDoc.exists ? planDoc.data() : { content: "" },
      video_status: videoDoc.exists ? videoDoc.data() : { content: "" },
      daily_context: contextDoc.exists ? contextDoc.data() : { entries: [] }
    });
  } catch (error) {
    logRouteError("omni-ledger GET", error);
    return NextResponse.json({ error: "Failed to fetch omni-ledger" }, { status: 500 });
  }
}

/**
 * POST /api/omni-ledger
 * Updates or appends to the omni-ledger.
 * 
 * Body params:
 *   - type: "plan_status" | "video_status" | "daily_context"
 *   - content: string (Markdown content)
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { type, content } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "Missing type or content" }, { status: 400 });
    }

    const ledgerRef = adminDb.collection("omni_ledger");

    if (type === "daily_context") {
      // Append-only logic for daily context
      const docRef = ledgerRef.doc("daily_context");
      const docSnap = await docRef.get();
      
      const newEntry = {
        timestamp: new Date().toISOString(),
        content: content
      };

      if (docSnap.exists) {
        const currentData = docSnap.data();
        const entries = currentData.entries || [];
        entries.push(newEntry);
        await docRef.update({ entries });
      } else {
        await docRef.set({ entries: [newEntry] });
      }

      return NextResponse.json({ success: true, appended: true });

    } else if (type === "plan_status" || type === "video_status") {
      // Overwrite logic for status reports
      await ledgerRef.doc(type).set({
        content: content,
        updatedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, updated: true });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

  } catch (error) {
    logRouteError("omni-ledger POST", error);
    return NextResponse.json({ error: "Failed to update omni-ledger" }, { status: 500 });
  }
}
