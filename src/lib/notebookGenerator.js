import { generate } from "@/lib/geminiClient";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logUsage } from "@/lib/costTracker";

/**
 * Auto-generate a Colab notebook config from ingested content.
 * Generated notebooks start with status "pending" and require user approval.
 * 
 * The notebook config describes WHAT analysis to run — the actual execution
 * uses Gemini when the user triggers "Run" in the Colab module.
 */

const NOTEBOOK_CATEGORIES = ["skill", "workflow", "agent_config", "brain_reference"];

const GENERATION_PROMPT = `You are an AI research analyst. Given the following ingested content, determine if a useful analysis notebook should be created from it.

A notebook is useful when the content contains:
- Data that can be further analyzed, cross-referenced, or transformed
- Techniques, tools, or strategies that can be tested or benchmarked
- Research material that benefits from structured processing

If a notebook should be created, return JSON:
{
  "shouldCreate": true,
  "notebook": {
    "name": "Short descriptive name",
    "description": "What this notebook analyzes and produces",
    "analysisPrompt": "The exact prompt to send to Gemini when this notebook runs. This should be specific and reference the ingested content.",
    "parameters": [
      { "name": "param_name", "type": "string", "required": false, "description": "Optional parameter", "default": "value" }
    ],
    "expectedOutputs": ["What the analysis will produce — e.g., 'comparison table', 'implementation checklist', 'risk assessment'"],
    "estimatedCost": "$0.02-0.05"
  }
}

If a notebook is NOT useful for this content, return:
{ "shouldCreate": false, "reason": "Why this content doesn't benefit from a notebook" }

CONTENT TO EVALUATE:
---
Title: {TITLE}
Type: {TYPE}
Category: {CATEGORY}
Tags: {TAGS}

Content (first 8000 chars):
{CONTENT}
---`;

/**
 * Generate a notebook config from a staging entry.
 * Returns the notebook config if created, or null if skipped.
 */
export async function generateNotebook(stagingEntry) {
  // Only generate for relevant categories
  if (!NOTEBOOK_CATEGORIES.includes(stagingEntry.classification?.category)) {
    return null;
  }

  const prompt = GENERATION_PROMPT
    .replace("{TITLE}", stagingEntry.title || "Untitled")
    .replace("{TYPE}", stagingEntry.type || "text")
    .replace("{CATEGORY}", stagingEntry.classification?.category || "unknown")
    .replace("{TAGS}", stagingEntry.classification?.tags?.join(", ") || "none")
    .replace("{CONTENT}", (stagingEntry.content || "").slice(0, 8000));

  const result = await generate({
    prompt,
    model: "flash",
    temperature: 0.3,
    maxOutputTokens: 2048,
    responseFormat: "json",
  });

  // Log the cost
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
    console.warn("[notebookGenerator] Failed to parse response");
    return null;
  }

  if (!parsed.shouldCreate || !parsed.notebook) {
    return null;
  }

  const nb = parsed.notebook;
  const notebookDoc = {
    id: `nb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: nb.name,
    description: nb.description,
    analysisPrompt: nb.analysisPrompt,
    parameters: nb.parameters || [],
    expectedOutputs: nb.expectedOutputs || [],
    estimatedCost: nb.estimatedCost || "$0.02-0.05",
    status: "pending", // pending → approved → available
    sourceEntryId: stagingEntry.id,
    sourceTitle: stagingEntry.title,
    sourceType: stagingEntry.type,
    // Store the FULL raw content that will be fed to the notebook
    // This is what the user reviews before approving
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
