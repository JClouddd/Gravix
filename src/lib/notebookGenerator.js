import { generate } from "@/lib/geminiClient";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logUsage } from "@/lib/costTracker";

/**
 * notebookGenerator.js — Auto-generates Colab notebook configs from ingested content.
 *
 * ALWAYS creates a notebook for every ingested piece of content.
 * Uses templates to enforce structure based on content type.
 * Notebooks start as "pending" and require user approval.
 */

/* ── Notebook Templates ─────────────────────────────────────────── */

const NOTEBOOK_TEMPLATES = {
  tool_analysis: {
    type: "tool_analysis",
    label: "Tool Analysis",
    color: "#4285f4",
    description: "Deep-dive into a tool, framework, or platform",
    requiredFields: ["name", "description", "analysisPrompt", "toolsReferenced", "googleMapping"],
    triggerTags: ["tool", "framework", "library", "api", "platform", "sdk", "cli"],
  },
  competitive_intel: {
    type: "competitive_intel",
    label: "Competitive Intel",
    color: "#ea4335",
    description: "Compare non-Google platform capabilities to Google equivalents",
    requiredFields: ["name", "description", "analysisPrompt", "sourcePlatform", "googleEquivalent"],
    triggerTags: ["claude", "openai", "anthropic", "aws", "azure", "vercel", "competitor"],
  },
  tutorial_extraction: {
    type: "tutorial_extraction",
    label: "Tutorial",
    color: "#34a853",
    description: "Step-by-step procedure extracted from content",
    requiredFields: ["name", "description", "analysisPrompt", "steps", "prerequisites"],
    triggerTags: ["tutorial", "how-to", "setup", "guide", "walkthrough", "install"],
  },
  skill_reference: {
    type: "skill_reference",
    label: "Skill Reference",
    color: "#fbbc05",
    description: "Technique, pattern, or capability for agent skill library",
    requiredFields: ["name", "description", "analysisPrompt", "skillCategory", "applicableAgents"],
    triggerTags: ["skill", "technique", "pattern", "strategy", "methodology", "workflow"],
  },
  research_note: {
    type: "research_note",
    label: "Research Note",
    color: "#9aa0a6",
    description: "General knowledge capture — default for all content",
    requiredFields: ["name", "description", "analysisPrompt"],
    triggerTags: [], // Default — matches everything
  },
};

/* ── Auto-Merge Rules ───────────────────────────────────────────── */

const MERGE_RULES = {
  tagOverlapThreshold: 0.7,       // >70% shared tags → auto-merge
  sameToolMerge: true,            // Multiple notebooks about same tool → merge
  competingPlatformCompare: true, // Competing platforms → comparison notebook, not merge
  timeProximityHours: 24,         // Ingested within 24h + >50% overlap → merge
  crossDomainMinOverlap: 0.3,    // <30% overlap → never merge, only cross-ref
};

/* ── Template Selection ─────────────────────────────────────────── */

function selectTemplate(classification, analysis) {
  const tags = (classification?.tags || []).map(t => t.toLowerCase());
  const content = JSON.stringify(analysis || {}).toLowerCase();

  // Check for competitive intel first (non-Google platforms)
  const competitorKeywords = ["claude", "openai", "anthropic", "aws", "azure", "vercel", "cursor", "copilot"];
  if (competitorKeywords.some(k => tags.includes(k) || content.includes(k))) {
    return NOTEBOOK_TEMPLATES.competitive_intel;
  }

  // Check for tutorials/procedures
  if (analysis?.step_by_step_procedures?.length > 0 ||
      NOTEBOOK_TEMPLATES.tutorial_extraction.triggerTags.some(t => tags.includes(t))) {
    return NOTEBOOK_TEMPLATES.tutorial_extraction;
  }

  // Check for skill references
  if (NOTEBOOK_TEMPLATES.skill_reference.triggerTags.some(t => tags.includes(t)) ||
      classification?.category === "skill" || classification?.category === "workflow") {
    return NOTEBOOK_TEMPLATES.skill_reference;
  }

  // Check for tool analysis
  if (analysis?.tools_and_software?.length > 0 ||
      NOTEBOOK_TEMPLATES.tool_analysis.triggerTags.some(t => tags.includes(t))) {
    return NOTEBOOK_TEMPLATES.tool_analysis;
  }

  // Default: research note
  return NOTEBOOK_TEMPLATES.research_note;
}

/* ── Find Related Notebooks ─────────────────────────────────────── */

async function findRelatedNotebooks(tags) {
  const related = [];

  try {
    const snapshot = await adminDb.collection("notebooks").get();
    snapshot.forEach(doc => {
      const nb = doc.data();
      const nbTags = (nb.classification?.tags || []).map(t => t.toLowerCase());
      const inputTags = tags.map(t => t.toLowerCase());

      // Calculate tag overlap
      const intersection = inputTags.filter(t => nbTags.includes(t));
      const union = new Set([...inputTags, ...nbTags]);
      const overlap = union.size > 0 ? intersection.length / union.size : 0;

      if (overlap > 0.2) { // At least 20% overlap to be "related"
        related.push({
          id: doc.id,
          name: nb.name,
          type: nb.notebookType,
          overlap: Math.round(overlap * 100),
          sharedTags: intersection,
          shouldMerge: overlap >= MERGE_RULES.tagOverlapThreshold,
        });
      }
    });
  } catch (err) {
    console.warn("[notebookGenerator] Related notebook search failed:", err.message);
  }

  return related.sort((a, b) => b.overlap - a.overlap);
}

/* ── Generation Prompt ──────────────────────────────────────────── */

function buildPrompt(stagingEntry, template) {
  return `You are an AI research analyst for Gravix, an AI operating system built on Google Cloud.

You are creating a "${template.label}" notebook from ingested content.

Template type: ${template.type}
Required fields: ${template.requiredFields.join(", ")}

ALWAYS return valid JSON with this structure:
{
  "notebook": {
    "name": "Short descriptive name (5-8 words max)",
    "description": "What this notebook analyzes and produces (1-2 sentences)",
    "analysisPrompt": "The exact, detailed prompt to send to Gemini when this notebook runs. Reference the ingested content specifically.",
    "parameters": [
      { "name": "param_name", "type": "string", "required": false, "description": "Optional parameter", "default": "value" }
    ],
    "expectedOutputs": ["What the analysis will produce"],
    "estimatedCost": "$0.02-0.05",
    "toolsReferenced": ["Tools and platforms mentioned in the content"],
    "googleMapping": [
      {"source": "Non-Google tool", "googleEquivalent": "Google service", "notes": "Migration complexity"}
    ],
    "skillCategory": "The skill domain this falls under (e.g., 'coding', 'devops', 'research', 'analytics')",
    "applicableAgents": ["Which Gravix agents would use this: conductor, scholar, forge, analyst, courier, sentinel, builder"],
    "steps": ["If tutorial: step-by-step procedure"],
    "prerequisites": ["If tutorial: what's needed first"]
  }
}

Only include fields that are relevant. Always include: name, description, analysisPrompt, skillCategory, applicableAgents.

CONTENT TO ANALYZE:
---
Title: ${stagingEntry.title || "Untitled"}
Type: ${stagingEntry.type || "text"}
Category: ${stagingEntry.classification?.category || "unknown"}
Tags: ${stagingEntry.classification?.tags?.join(", ") || "none"}

Content (first 10000 chars):
${(stagingEntry.content || "").slice(0, 10000)}
---`;
}

/* ── Main Generator ─────────────────────────────────────────────── */

/**
 * Generate a notebook config from a staging entry.
 * ALWAYS returns a notebook — never null.
 */
export async function generateNotebook(stagingEntry) {
  const template = selectTemplate(stagingEntry.classification, stagingEntry.analysis);

  const prompt = buildPrompt(stagingEntry, template);

  const result = await generate({
    prompt,
    model: "flash",
    temperature: 0.3,
    maxOutputTokens: 4096,
    responseFormat: "json",
  });

  // Log cost
  await logUsage({
    route: "/lib/notebookGenerator",
    model: "gemini-2.5-flash",
    agent: "analyst",
    inputTokens: result.inputTokens || 0,
    outputTokens: result.outputTokens || 0,
    cost: result.cost || 0,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.text || result);
  } catch {
    console.warn("[notebookGenerator] Failed to parse — creating minimal notebook");
    parsed = {
      notebook: {
        name: `Research: ${stagingEntry.title || "Untitled"}`.slice(0, 60),
        description: `Auto-generated research note from ${stagingEntry.type} ingestion`,
        analysisPrompt: `Analyze the following content and provide key insights, patterns, and actionable items:\n\n${(stagingEntry.content || "").slice(0, 5000)}`,
        skillCategory: "research",
        applicableAgents: ["scholar"],
      },
    };
  }

  const nb = parsed.notebook || parsed;

  // Find related notebooks
  const relatedNotebooks = await findRelatedNotebooks(stagingEntry.classification?.tags || []);

  const notebookDoc = {
    id: `nb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: nb.name || `Research: ${stagingEntry.title}`,
    description: nb.description || "Auto-generated notebook",
    analysisPrompt: nb.analysisPrompt || "",
    parameters: nb.parameters || [],
    expectedOutputs: nb.expectedOutputs || [],
    estimatedCost: nb.estimatedCost || "$0.02-0.05",
    notebookType: template.type,
    templateLabel: template.label,
    templateColor: template.color,
    // Skill and agent linkage
    skillCategory: nb.skillCategory || "research",
    applicableAgents: nb.applicableAgents || ["scholar"],
    toolsReferenced: nb.toolsReferenced || [],
    googleMapping: nb.googleMapping || [],
    steps: nb.steps || [],
    prerequisites: nb.prerequisites || [],
    // Relationships
    relatedNotebooks: relatedNotebooks.map(r => ({ id: r.id, name: r.name, overlap: r.overlap })),
    mergeCandidate: relatedNotebooks.find(r => r.shouldMerge) || null,
    // Source tracking
    status: "pending",
    sourceEntryId: stagingEntry.id,
    sourceTitle: stagingEntry.title,
    sourceType: stagingEntry.type,
    rawContent: stagingEntry.content,
    rawContentLength: stagingEntry.content?.length || 0,
    classification: stagingEntry.classification,
    createdAt: FieldValue.serverTimestamp(),
    approvedAt: null,
  };

  // Save to Firestore
  await adminDb.collection("notebooks").doc(notebookDoc.id).set(notebookDoc);

  return notebookDoc;
}

/* ── Exported Constants ─────────────────────────────────────────── */
export { NOTEBOOK_TEMPLATES, MERGE_RULES };
