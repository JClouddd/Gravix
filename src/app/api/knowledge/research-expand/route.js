import { generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/knowledge/research-expand
 * Takes a notebook ID and deeply researches all critical tools mentioned.
 * Fetches docs, pricing, API refs, GitHub repos, and Google equivalents.
 *
 * Body: { notebookId: string } or { entryId: string }
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    const { notebookId, entryId } = await request.json();
    const targetId = notebookId || entryId;

    if (!targetId) {
      return Response.json({ error: "notebookId or entryId is required" }, { status: 400 });
    }

    // Try to find the data in notebooks first, then knowledge entries
    let sourceData = null;
    let sourceCollection = "notebooks";

    const nbDoc = await adminDb.collection("notebooks").doc(targetId).get();
    if (nbDoc.exists) {
      sourceData = nbDoc.data();
    } else {
      const entryDoc = await adminDb.collection("knowledge").doc(targetId).get();
      if (entryDoc.exists) {
        sourceData = entryDoc.data();
        sourceCollection = "knowledge";
      }
    }

    if (!sourceData) {
      return Response.json({ error: `Document ${targetId} not found` }, { status: 404 });
    }

    // Extract tools from multiple possible locations
    const analysis = sourceData.analysis || {};
    const title = sourceData.name || sourceData.title || "Unknown";
    const summary = analysis.summary || sourceData.description || "";

    // Tools can be in multiple places depending on document type
    let tools = analysis.tools_and_software || [];
    let integrations = analysis.integrations_and_apis || [];

    // Notebooks store tools differently — check toolsReferenced field
    if (tools.length === 0 && sourceData.toolsReferenced) {
      tools = (sourceData.toolsReferenced || []).map(t =>
        typeof t === "string" ? { name: t, type: "tool", purpose: "" } : t
      );
    }

    // If still no tools, try to find the linked knowledge entry
    if (tools.length === 0 && sourceData.sourceEntryId) {
      try {
        const entryDoc = await adminDb.collection("knowledge").doc(sourceData.sourceEntryId).get();
        if (entryDoc.exists) {
          const entryData = entryDoc.data();
          const entryAnalysis = entryData.analysis || {};
          tools = entryAnalysis.tools_and_software || [];
          integrations = entryAnalysis.integrations_and_apis || [];
          if (!summary && entryAnalysis.summary) {
            // Use entry summary if notebook doesn't have one
          }
        }
      } catch (err) {
        console.warn("[research-expand] Failed to fetch linked entry:", err.message);
      }
    }

    // Last resort: extract tool names from tags
    if (tools.length === 0) {
      const tags = sourceData.classification?.tags || [];
      // Filter out generic tags, keep ones that look like tool names
      const genericWords = ["ai", "coding", "tool", "workflow", "automation", "guide", "tutorial", "productivity"];
      const toolCandidates = tags.filter(t => !genericWords.includes(t.toLowerCase()) && t.length > 2);
      tools = toolCandidates.slice(0, 5).map(t => ({ name: t, type: "unknown", purpose: "mentioned in content" }));
    }

    if (tools.length === 0 && integrations.length === 0) {
      return Response.json({
        message: "No tools or integrations found to research",
        notebookId: targetId,
        toolsFound: 0,
      });
    }

    // Prioritize tools: core workflow tools first, then integrations
    const allTools = [
      ...tools.map(t => ({ ...t, priority: "core" })),
      ...integrations.map(t => ({ name: t.name || t, type: "api", purpose: t.purpose || t.description || "", priority: "integration" })),
    ];

    // Research top 5 most important tools
    const toolsToResearch = allTools.slice(0, 5);

    console.log(`[research-expand] Researching ${toolsToResearch.length} tools for "${title}"`);

    // Research each tool using Gemini grounded search
    const dossiers = await Promise.all(
      toolsToResearch.map(tool => researchTool(tool, summary))
    );

    // Generate Google translation deep mapping
    const googleMapping = await generateGoogleMapping(toolsToResearch, summary);

    // Generate skill specification
    const skillSpec = await generateSkillSpec(title, summary, dossiers, googleMapping);

    // Generate truth validation
    const validation = await validateContent(title, summary, dossiers, sourceData);

    // Calculate research cost
    const totalTokens = dossiers.reduce((sum, d) => sum + (d._tokens || 0), 0)
      + (googleMapping._tokens || 0)
      + (skillSpec._tokens || 0)
      + (validation._tokens || 0);
    const researchCost = (totalTokens / 1_000_000) * 0.15; // blended rate

    // Store research results back to the notebook
    const researchData = {
      researchDossier: dossiers.map(d => {
        const { _tokens, ...rest } = d;
        return rest;
      }),
      googleTranslation: (() => { const { _tokens, ...rest } = googleMapping; return rest; })(),
      skillSpec: (() => { const { _tokens, ...rest } = skillSpec; return rest; })(),
      validation: (() => { const { _tokens, ...rest } = validation; return rest; })(),
      researchMeta: {
        toolsResearched: toolsToResearch.length,
        totalTokens,
        cost: `$${researchCost.toFixed(4)}`,
        executionTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        completedAt: new Date().toISOString(),
      },
    };

    // Sanitize for Firestore
    function sanitize(obj) {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        clean[k] = v === undefined ? null : sanitize(v);
      }
      return clean;
    }

    await adminDb.collection(sourceCollection).doc(targetId).update(
      sanitize(researchData)
    );

    // Log usage
    await logUsage({
      route: "/api/knowledge/research-expand",
      model: "gemini-2.5-flash",
      agent: "scholar",
      inputTokens: totalTokens,
      outputTokens: Math.round(totalTokens * 0.1),
      totalTokens: Math.round(totalTokens * 1.1),
      cost: researchCost,
    });

    return Response.json({
      success: true,
      notebookId: targetId,
      toolsResearched: dossiers.length,
      skillSpec: {
        name: skillSpec.skillName,
        complexity: skillSpec.migrationComplexity,
        buildTime: skillSpec.estimatedBuildTime,
      },
      validation: {
        status: validation.overallStatus,
        confidence: validation.confidenceScore,
      },
      cost: `$${researchCost.toFixed(4)}`,
      executionTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    });
  } catch (error) {
    console.error("[/api/knowledge/research-expand]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ── Research a Single Tool ─────────────────────────────────────── */
async function researchTool(tool, videoContext) {
  const prompt = `You are a technical research analyst. Research this tool/platform thoroughly.

TOOL: ${tool.name}
TYPE: ${tool.type || "unknown"}
PURPOSE: ${tool.purpose || "mentioned in a technical video"}
VIDEO CONTEXT: ${videoContext.slice(0, 500)}

Provide a comprehensive research dossier. Return valid JSON:
{
  "toolName": "${tool.name}",
  "category": "string (sdk/api/platform/library/service)",
  "officialWebsite": "string (URL)",
  "documentationUrl": "string (URL to official docs)",
  "githubRepo": "string (GitHub URL if open source, or null)",
  "description": "string (1-2 sentence description of what it does)",
  "keyFeatures": ["array of top 5 features"],
  "pricing": {
    "hasFreeTeir": true/false,
    "freeLimit": "string (what the free tier includes)",
    "paidStarting": "string (starting price)",
    "enterpriseAvailable": true/false
  },
  "apiReference": {
    "authMethod": "string (API key, OAuth, etc.)",
    "baseUrl": "string",
    "rateLimit": "string",
    "sdks": ["array of available SDKs: js, python, etc."]
  },
  "dependencies": ["array of npm/pip packages needed"],
  "currentVersion": "string",
  "lastUpdated": "string (approximate)",
  "alternatives": ["array of alternative tools"],
  "limitations": ["array of known limitations"],
  "relevanceScore": 0-10 (how relevant to the video's core workflow)
}`;

  try {
    const result = await generate({
      prompt,
      systemPrompt: "You are a technical research analyst. Return ONLY valid JSON. Use real, accurate information. If unsure about a fact, say null rather than guessing.",
      complexity: "flash",
      grounded: true,
    });

    let dossier = {};
    try {
      const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      dossier = JSON.parse(text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) dossier = JSON.parse(match[0]);
    }

    dossier._tokens = result.tokens?.total || 0;
    dossier.priority = tool.priority;
    return dossier;
  } catch (err) {
    return {
      toolName: tool.name,
      error: err.message,
      _tokens: 0,
      priority: tool.priority,
    };
  }
}

/* ── Google Translation Deep Mapping ────────────────────────────── */
async function generateGoogleMapping(tools, videoContext) {
  const toolNames = tools.map(t => t.name).join(", ");

  const prompt = `You are a Google Cloud architect. For each tool below, provide a deep migration mapping to Google Cloud / Firebase equivalents.

TOOLS: ${toolNames}
CONTEXT: ${videoContext.slice(0, 500)}

For each tool, return JSON:
{
  "mappings": [
    {
      "source": "tool name",
      "googleEquivalent": "Google service name (or null if no equivalent)",
      "recommendation": "keep/replace/hybrid",
      "reasoning": "1 sentence why",
      "integrationPath": "how to integrate into a Next.js app on Firebase App Hosting",
      "gravixModule": "which Gravix module this maps to (agents/knowledge/colab/etc.)",
      "estimatedSetup": "30 minutes / 2 hours / etc.",
      "secretsNeeded": ["array of Secret Manager keys needed"],
      "apisToEnable": ["array of Google Cloud APIs to enable"]
    }
  ],
  "_tokens": 0
}`;

  try {
    const result = await generate({
      prompt,
      systemPrompt: "You are a Google Cloud architect. Return ONLY valid JSON. Be practical and specific about integration paths.",
      complexity: "flash",
      grounded: true,
    });

    let mapping = {};
    try {
      const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      mapping = JSON.parse(text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) mapping = JSON.parse(match[0]);
    }

    mapping._tokens = result.tokens?.total || 0;
    return mapping;
  } catch (err) {
    return { mappings: [], error: err.message, _tokens: 0 };
  }
}

/* ── Skill Specification Generator ──────────────────────────────── */
async function generateSkillSpec(title, summary, dossiers, googleMapping) {
  const toolProfiles = dossiers
    .filter(d => !d.error)
    .map(d => `- ${d.toolName}: ${d.description || ""} (${d.category || "unknown"})`)
    .join("\n");

  const mappingSummary = (googleMapping.mappings || [])
    .map(m => `- ${m.source} → ${m.googleEquivalent || "keep"} (${m.recommendation})`)
    .join("\n");

  const prompt = `Generate a skill specification for the Antigravity/Gravix AI operating system.

VIDEO TITLE: ${title}
SUMMARY: ${summary.slice(0, 1000)}

TOOLS RESEARCHED:
${toolProfiles}

GOOGLE MAPPINGS:
${mappingSummary}

Return a JSON skill specification:
{
  "skillName": "string (short, descriptive name for this capability)",
  "description": "string (what this skill enables the system to do)",
  "domainTags": ["array of domain tags like video_generation, web_scraping, etc."],
  "antigravityTranslation": {
    "originalStack": ["tools from the video"],
    "googleStack": ["Google equivalents we'll use"],
    "keepAsIs": ["tools with no Google equivalent that we keep"],
    "migrationComplexity": "easy/moderate/complex",
    "estimatedBuildTime": "2-4 hours / etc."
  },
  "prerequisites": {
    "apis": ["Google Cloud APIs to enable"],
    "secrets": ["Secret Manager keys needed"],
    "dependencies": ["npm packages to install"],
    "existingModules": ["Gravix modules this builds on"]
  },
  "buildPlan": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "costEstimate": {
    "monthly": "$X-Y per month",
    "oneTime": "$0 or setup cost"
  },
  "applicableAgents": ["which Gravix agents can use this skill"],
  "linkedModules": ["which Hub modules benefit from this skill"]
}`;

  try {
    const result = await generate({
      prompt,
      systemPrompt: "You are the Antigravity system architect. Generate practical, buildable skill specs. Return ONLY valid JSON.",
      complexity: "flash",
    });

    let spec = {};
    try {
      const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      spec = JSON.parse(text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) spec = JSON.parse(match[0]);
    }

    spec._tokens = result.tokens?.total || 0;
    return spec;
  } catch (err) {
    return { skillName: title, error: err.message, _tokens: 0 };
  }
}

/* ── Truth Validation ───────────────────────────────────────────── */
async function validateContent(title, summary, dossiers, sourceData) {
  const toolInfo = dossiers
    .filter(d => !d.error)
    .map(d => `${d.toolName}: v${d.currentVersion || "?"}, last updated ${d.lastUpdated || "?"}, pricing: ${d.pricing?.paidStarting || "?"}`)
    .join("\n");

  const publishedAt = sourceData.analysis?.youtube_metadata?.publishedAt || sourceData.createdAt || "unknown";

  const prompt = `Validate the accuracy and recency of this technical content.

TITLE: ${title}
PUBLISHED: ${publishedAt}
CURRENT DATE: ${new Date().toISOString().split("T")[0]}

TOOL VERSIONS MENTIONED:
${toolInfo}

CONTENT SUMMARY: ${summary.slice(0, 1000)}

Return JSON validation report:
{
  "overallStatus": "verified/caution/stale",
  "confidenceScore": 0.0-1.0,
  "recencyCheck": {
    "ageInDays": number,
    "status": "current/aging/stale",
    "note": "string"
  },
  "versionChecks": [
    {
      "tool": "tool name",
      "mentionedVersion": "version from content",
      "currentVersion": "latest known version",
      "status": "current/outdated/unknown"
    }
  ],
  "deprecationWarnings": ["array of any known deprecations"],
  "factualConcerns": ["array of any claims that seem inaccurate"],
  "recommendations": ["array of suggested updates or verifications"]
}`;

  try {
    const result = await generate({
      prompt,
      systemPrompt: "You are a technical fact-checker. Validate claims against your knowledge. Return ONLY valid JSON. Flag anything uncertain as 'unknown' rather than guessing.",
      complexity: "flash",
      grounded: true,
    });

    let validation = {};
    try {
      const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      validation = JSON.parse(text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) validation = JSON.parse(match[0]);
    }

    validation._tokens = result.tokens?.total || 0;
    return validation;
  } catch (err) {
    return { overallStatus: "unknown", confidenceScore: 0, error: err.message, _tokens: 0 };
  }
}
