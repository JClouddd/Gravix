import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/finance/income — List income entries + totals
 */
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("income_entries")
      .orderBy("date", "desc")
      .limit(100)
      .get();

    const entries = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        source: d.source || "",
        amount: typeof d.amount === "number" ? d.amount : parseFloat(d.amount) || 0,
        date: d.date || "",
        category: d.category || "other",
      };
    });

    // Totals
    const totalIncome = entries.reduce((sum, e) => sum + e.amount, 0);

    // Current month
    const now = new Date();
    const monthPrefix = now.toISOString().slice(0, 7); // "YYYY-MM"
    const monthlyIncome = entries
      .filter((e) => e.date?.startsWith(monthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    return Response.json({ entries, totalIncome, monthlyIncome });
  } catch (error) {
    console.error("[/api/finance/income] GET error:", error);
    return Response.json({ entries: [], totalIncome: 0, monthlyIncome: 0 });
  }
}

/**
 * POST /api/finance/income — Add a new income entry
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { source, amount, date, category } = body;

    if (!source || !amount) {
      return Response.json({ error: "source and amount are required" }, { status: 400 });
    }

    const entry = {
      source,
      amount: parseFloat(amount) || 0,
      date: date || new Date().toISOString().split("T")[0],
      category: category || "other",
      createdAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection("income_entries").add(entry);

    // Re-fetch all entries to return updated list
    const snapshot = await adminDb
      .collection("income_entries")
      .orderBy("date", "desc")
      .limit(100)
      .get();

    const entries = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        source: d.source || "",
        amount: typeof d.amount === "number" ? d.amount : parseFloat(d.amount) || 0,
        date: d.date || "",
        category: d.category || "other",
      };
    });

    const totalIncome = entries.reduce((sum, e) => sum + e.amount, 0);
    const now = new Date();
    const monthPrefix = now.toISOString().slice(0, 7);
    const monthlyIncome = entries
      .filter((e) => e.date?.startsWith(monthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    return Response.json({ entries, totalIncome, monthlyIncome });
  } catch (error) {
    console.error("[/api/finance/income] POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
