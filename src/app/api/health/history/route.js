import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const checksRef = adminDb.collection("health_checks");
    const q = checksRef.orderBy("timestamp", "desc").limit(30);
    const snapshot = await q.get();

    const checks = [];
    let healthyCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      checks.push(data);
      if (data.status === "healthy") {
        healthyCount++;
      }
    });

    const uptime = checks.length > 0 ? (healthyCount / checks.length) * 100 : 100;

    return NextResponse.json({ checks, uptime });
  } catch (error) {
    console.error("Error fetching health history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const checksRef = adminDb.collection("health_checks");
    await checksRef.add( data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing health history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
