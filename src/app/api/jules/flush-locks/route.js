import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const activeSnaps = await adminDb.collection("jules_file_locks").where("status", "==", "active").get();
    let deleted = 0;
    for (const doc of activeSnaps.docs) {
      await doc.ref.delete();
      deleted++;
    }

    const queueSnaps = await adminDb.collection("jules_file_locks").where("status", "==", "queued").get();
    let updated = 0;
    for (const doc of queueSnaps.docs) {
      await doc.ref.update({ blockedBy: [] });
      updated++;
    }

    // Ping monitor to trigger queue pickup
    fetch("http://localhost:3000/api/jules/monitor").catch(() => {});

    return Response.json({ success: true, deleted, updated });
  } catch(e) {
    return Response.json({ success: false, error: e.message });
  }
}
