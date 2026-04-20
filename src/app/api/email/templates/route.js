import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("email_templates").get();
    const templates = [];
    snapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    return Response.json(templates, { status: 200 });
  } catch (error) {
    logRouteError("email", "/api/email/templates error", error, "/api/email/templates");
    return Response.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, subject, body, category } = data;

    if (!name || !subject || !body) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newTemplate = {
      name,
      subject,
      body,
      category: category || "General",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await adminDb.collection("email_templates").add(newTemplate);
    return Response.json({ id: docRef.id, ...newTemplate }, { status: 201 });
  } catch (error) {
    logRouteError("email", "/api/email/templates error", error, "/api/email/templates");
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, name, subject, body, category } = data;

    if (!id || !name || !subject || !body) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updateData = {
      name,
      subject,
      body,
      category: category || "General",
      updatedAt: Date.now(),
    };

    await adminDb.collection("email_templates").doc(id).update(updateData);
    return Response.json({ id, ...updateData }, { status: 200 });
  } catch (error) {
    logRouteError("email", "/api/email/templates error", error, "/api/email/templates");
    return Response.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Template ID is required" }, { status: 400 });
    }

    await adminDb.collection("email_templates").doc(id).delete();
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    logRouteError("email", "/api/email/templates error", error, "/api/email/templates");
    return Response.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
