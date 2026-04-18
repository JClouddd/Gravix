import { collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agentName");

    if (!agentName) {
      return Response.json({ error: "agentName is required" }, { status: 400 });
    }

    const conversationsRef = collection(db, "agent_conversations");
    const q = query(
      conversationsRef,
      where("agentName", "==", agentName),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return Response.json({ conversations });
  } catch (error) {
    console.error("[/api/agents/memory] GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { agentName, messages, summary } = await request.json();

    if (!agentName || !messages) {
      return Response.json({ error: "agentName and messages are required" }, { status: 400 });
    }

    const newDoc = {
      agentName,
      messages,
      summary: summary || "No summary",
      timestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "agent_conversations"), newDoc);

    return Response.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("[/api/agents/memory] POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agentName");

    if (!agentName) {
      return Response.json({ error: "agentName is required" }, { status: 400 });
    }

    const conversationsRef = collection(db, "agent_conversations");
    const q = query(
      conversationsRef,
      where("agentName", "==", agentName)
    );

    const snapshot = await getDocs(q);

    // In a real production app, this should be chunked or batched
    // For now we just loop and delete
    const deletePromises = snapshot.docs.map(document =>
      deleteDoc(doc(db, "agent_conversations", document.id))
    );

    await Promise.all(deletePromises);

    return Response.json({ success: true, deletedCount: deletePromises.length });
  } catch (error) {
    console.error("[/api/agents/memory] DELETE error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
