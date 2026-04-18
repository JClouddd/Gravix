import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { structuredGenerate } from "@/lib/geminiClient";

/**
 * POST /api/knowledge/crossref
 * Analyzes a newly ingested document against the existing knowledge base
 * Identifies related documents, contradictions, and suggestions.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, content, source } = body;

    if (!content) {
      return Response.json({ error: "Content is required for cross-referencing" }, { status: 400 });
    }

    // 1. Query the existing knowledge base using the content summary or title
    const searchUrl = new URL('/api/knowledge/query', request.url);
    const queryPayload = { query: title || content.substring(0, 500) };

    let existingKnowledge = [];
    try {
      const searchRes = await fetch(searchUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        existingKnowledge = searchData.results || [];
      } else {
        console.warn("[knowledge/crossref] Knowledge query failed:", await searchRes.text());
      }
    } catch (err) {
      console.warn("[knowledge/crossref] Internal fetch to /api/knowledge/query failed:", err);
    }

    // Prepare context for Gemini
    const existingKnowledgeContext = existingKnowledge.length > 0
      ? existingKnowledge.map(doc => `Title: ${doc.title}\nSnippet: ${doc.snippet}`).join("\n\n")
      : "No existing related documents found in the knowledge base.";

    // 2. Use Gemini to analyze the new doc against existing knowledge
    const systemPrompt = "You are the Scholar Agent. Analyze this newly ingested document and compare it with the existing knowledge base results provided.";
    const userPrompt = `
Compare this newly ingested document with the existing knowledge base results.
Identify:
1) Related existing documents
2) Any contradictions with existing knowledge
3) Suggested updates to existing entries
4) Tags or categories for the new doc.

New Document:
Title: ${title || "Untitled"}
Content Snippet: ${content.substring(0, 2000)}
Source: ${source || "unknown"}

Existing Knowledge Base Context:
${existingKnowledgeContext}
`;

    const schema = {
      type: "object",
      properties: {
        relatedDocs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              relevance: { type: "string" }
            },
            required: ["title", "relevance"]
          }
        },
        contradictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              existing: { type: "string" },
              new: { type: "string" },
              description: { type: "string" }
            },
            required: ["existing", "new", "description"]
          }
        },
        updateSuggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              target: { type: "string" },
              suggestion: { type: "string" }
            },
            required: ["target", "suggestion"]
          }
        },
        suggestedTags: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["relatedDocs", "contradictions", "updateSuggestions", "suggestedTags"]
    };

    let crossrefResult = { relatedDocs: [], contradictions: [], updateSuggestions: [], suggestedTags: [] };

    try {
      const geminiRes = await structuredGenerate({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        schema: schema,
        complexity: "flash", // Use flash for speed, pro if needed for complexity
      });
      crossrefResult = geminiRes.data;
    } catch (err) {
      console.warn("[knowledge/crossref] Gemini structured generation failed:", err);
      // Fallback empty result
    }

    // 3. Store cross-reference results in Firestore
    const crossrefData = {
      sourceDocument: { title, source, createdAt: new Date().toISOString() },
      analysis: crossrefResult,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "knowledge_crossrefs"), crossrefData);
    } catch (dbErr) {
      console.warn("[knowledge/crossref] Failed to save to Firestore:", dbErr);
    }

    return Response.json({ success: true, data: crossrefData });
  } catch (error) {
    console.error("[/api/knowledge/crossref] POST error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/knowledge/crossref
 * Return recent cross-references from Firestore
 */
export async function GET(request) {
  try {
    const q = query(
      collection(db, "knowledge_crossrefs"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return Response.json({ success: true, data: results });
  } catch (error) {
    console.error("[/api/knowledge/crossref] GET error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
