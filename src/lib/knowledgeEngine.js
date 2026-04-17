/**
 * knowledgeEngine.js — Knowledge ingestion and retrieval engine
 *
 * Handles:
 * - Document ingestion (URL, text, PDF transcripts)
 * - Content classification (Skill / Workflow / Agent Config / Rule / Reference)
 * - Staging area management (Scholar review flow)
 * - Firestore persistence for knowledge entries
 * - GCS storage for raw documents
 */

import { generate, structuredGenerate } from "@/lib/geminiClient";

/* ── Documentation Sources (for batch ingestion) ─────────────── */
export const DOCUMENTATION_SOURCES = [
  {
    id: "vertex-ai-adk",
    name: "Vertex AI ADK Docs",
    url: "https://cloud.google.com/vertex-ai/generative-ai/docs/agent-builder/overview",
    benefit: "Correct agent configs for Phase 7",
  },
  {
    id: "vertex-ai-agent-builder",
    name: "Vertex AI Agent Builder",
    url: "https://cloud.google.com/vertex-ai/generative-ai/docs/agent-builder",
    benefit: "Agent deployment and management",
  },
  {
    id: "gemini-api",
    name: "Gemini API Docs",
    url: "https://ai.google.dev/gemini-api/docs",
    benefit: "Optimal routing, model capabilities",
  },
  {
    id: "firebase",
    name: "Firebase Docs",
    url: "https://firebase.google.com/docs",
    benefit: "Auth, Firestore, FCM patterns",
  },
  {
    id: "nextjs",
    name: "Next.js 16 Docs",
    url: "https://nextjs.org/docs",
    benefit: "App Router, SSR, caching",
  },
  {
    id: "cloud-run",
    name: "Cloud Run Docs",
    url: "https://cloud.google.com/run/docs",
    benefit: "Container scaling, agent hosting",
  },
  {
    id: "secret-manager",
    name: "Secret Manager Docs",
    url: "https://cloud.google.com/secret-manager/docs",
    benefit: "Rotation, access patterns",
  },
  {
    id: "docai",
    name: "Document AI Docs",
    url: "https://cloud.google.com/document-ai/docs",
    benefit: "Document processing pipelines",
  },
  {
    id: "cloud-monitoring",
    name: "Cloud Monitoring Docs",
    url: "https://cloud.google.com/monitoring/docs",
    benefit: "Observability, Sentinel integration",
  },
  {
    id: "gmail-api",
    name: "Gmail API Docs",
    url: "https://developers.google.com/gmail/api",
    benefit: "Email module (Phase 10)",
  },
  {
    id: "meet-api",
    name: "Google Meet API Docs",
    url: "https://developers.google.com/meet/api",
    benefit: "Meeting integration (Phase 10)",
  },
  {
    id: "calendar-api",
    name: "Google Calendar API Docs",
    url: "https://developers.google.com/calendar/api",
    benefit: "Calendar connections",
  },
  {
    id: "tasks-api",
    name: "Google Tasks API Docs",
    url: "https://developers.google.com/tasks",
    benefit: "Task connections",
  },
  {
    id: "flutter",
    name: "Flutter Docs",
    url: "https://docs.flutter.dev",
    benefit: "Companion app (Phase 11)",
  },
  {
    id: "google-pay",
    name: "Google Pay API Docs",
    url: "https://developers.google.com/pay/api",
    benefit: "Future client billing",
  },
];

/* ── Content Categories ───────────────────────────────────────── */
export const CATEGORIES = [
  { id: "skill", label: "Skill", icon: "🛠️", description: "Reusable capability or technique" },
  { id: "workflow", label: "Workflow", icon: "🔄", description: "Repeatable multi-step process" },
  { id: "agent_config", label: "Agent Config", icon: "🤖", description: "Agent behavior or tool definition" },
  { id: "rule", label: "Rule", icon: "📏", description: "System constraint or guardrail" },
  { id: "mcp_config", label: "MCP Config", icon: "🔌", description: "MCP server or tool configuration" },
  { id: "brain_reference", label: "Brain Reference", icon: "🧠", description: "General knowledge or reference" },
];

/* ── Classify Content ─────────────────────────────────────────── */
export async function classifyContent(content, title = "") {
  const schema = {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: CATEGORIES.map((c) => c.id),
      },
      confidence: { type: "number" },
      summary: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      suggestedTitle: { type: "string" },
      crossReferences: {
        type: "array",
        items: { type: "string" },
        description: "Topics this content relates to",
      },
    },
    required: ["category", "confidence", "summary", "tags", "suggestedTitle"],
  };

  const result = await structuredGenerate({
    prompt: `Classify the following content for a knowledge management system.

Title: ${title || "Untitled"}
Content (first 3000 chars):
${content.slice(0, 3000)}

Categories:
${CATEGORIES.map((c) => `- ${c.id}: ${c.description}`).join("\n")}

Classify this content, provide a concise summary, suggest tags, and identify cross-references to other topics.`,
    schema,
    complexity: "flash",
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      category: "brain_reference",
      confidence: 0.5,
      summary: title || "Unclassified content",
      tags: [],
      suggestedTitle: title || "Untitled",
      crossReferences: [],
    };
  }
}

/* ── Process URL Content ──────────────────────────────────────── */
export async function processUrl(url) {
  // Use Gemini to summarize the URL content
  const result = await generate({
    prompt: `Fetch and summarize the content at this URL for a knowledge base.
URL: ${url}

Provide:
1. A comprehensive summary of the content
2. Key concepts and patterns mentioned
3. Code examples if any
4. How this relates to building a Google-native AI platform

Be thorough — this will be used as reference documentation.`,
    complexity: "pro",
    grounded: true,
  });

  return {
    url,
    content: result.text,
    tokens: result.tokens,
    cost: result.cost,
  };
}

/* ── Create Staging Entry ─────────────────────────────────────── */
export function createStagingEntry({
  content,
  title,
  type,
  source,
  classification,
}) {
  return {
    id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: classification?.suggestedTitle || title || "Untitled",
    type, // url, text, pdf, video_transcript
    source: source || "manual",
    content: content.slice(0, 50000), // Cap at 50K chars
    contentLength: content.length,
    classification,
    status: "staged", // staged → reviewed → approved → committed
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    approvedAt: null,
    reviewNotes: [],
  };
}

/* ── Scholar Chat (review conversation) ───────────────────────── */
export async function scholarChat(message, stagingEntry, history = []) {
  const systemPrompt = `You are Scholar, the knowledge management agent for Gravix. 
You are currently reviewing a staged ingestion entry.

Entry Details:
- Title: ${stagingEntry.title}
- Type: ${stagingEntry.type}
- Category: ${stagingEntry.classification?.category || "unclassified"}
- Summary: ${stagingEntry.classification?.summary || "No summary"}
- Tags: ${stagingEntry.classification?.tags?.join(", ") || "none"}

Content Preview (first 2000 chars):
${stagingEntry.content?.slice(0, 2000)}

Help the user review this content. Answer questions about it, suggest improvements to the classification, and provide recommendations on whether to approve or dismiss.`;

  return generate({
    prompt: message,
    systemPrompt,
    history,
    complexity: "flash",
  });
}

const exportedObject = {
  DOCUMENTATION_SOURCES,
  CATEGORIES,
  classifyContent,
  processUrl,
  createStagingEntry,
  scholarChat,
};

export default exportedObject;
