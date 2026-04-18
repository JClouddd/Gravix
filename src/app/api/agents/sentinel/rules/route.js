import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const rulesRef = adminDb.collection("sentinel_rules");
    const q = rulesRef.where("active", "==", true).orderBy("createdAt", "asc") // or desc, let's use asc as it's default for simple sort if not specified, but let's just make sure we sort by createdAt;

    // Firestore might require an index for where("active", "==", true) + orderBy("createdAt", "asc").
    // As a fallback to avoid index errors, we can just get active rules and sort in memory if needed,
    // but typically simple equality + orderBy works if indexed, or we can just query all and filter/sort.
    // Given the "No external dependencies" and potential index issues in a generic test environment,
    // let's do query all and filter/sort in memory to be perfectly safe, or just use simple query.
    // Actually, simple rulesRef.orderBy("createdAt", "asc")) and then filter active:true is safest without index setup.

    // Let's just try simple orderBy first, filter in memory
    const simpleQ = rulesRef.orderBy("createdAt", "asc");
    const snapshot = await simpleQ.get();

    const rules = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.active === true) {
        rules.push({ id: doc.id, ...data });
      }
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching sentinel rules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { condition, threshold, action, description } = await request.json();

    if (!condition || threshold === undefined || !action) {
      return NextResponse.json(
        { error: "Missing required fields (condition, threshold, action)" },
        { status: 400 }
      );
    }

    const newRule = {
      condition,
      threshold,
      action,
      description: description || "",
      active: true,
      createdAt: new Date().toISOString()
    };

    const rulesRef = adminDb.collection("sentinel_rules");
    const docRef = await rulesRef.add( newRule);

    return NextResponse.json({ created: true, ruleId: docRef.id });
  } catch (error) {
    console.error("Error creating sentinel rule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { ruleId } = await request.json();

    if (!ruleId) {
      return NextResponse.json({ error: "Missing ruleId" }, { status: 400 });
    }

    const ruleRef = adminDb.collection("sentinel_rules").doc(ruleId);
    await ruleRef.update( { active: false });

    return NextResponse.json({ deleted: true, ruleId });
  } catch (error) {
    console.error("Error deleting (deactivating) sentinel rule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
