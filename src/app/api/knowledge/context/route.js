import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/knowledge/context?domains=video_generation,ai_media
 * Returns relevant notebook summaries + skill specs for the given domains.
 * Used by agents at runtime to inject notebook knowledge as context.
 *
 * Also supports: ?all=true to return the full knowledge graph.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainsParam = searchParams.get("domains");
    const showAll = searchParams.get("all") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch approved notebooks with research data
    let query = adminDb.collection("notebooks").where("status", "==", "approved");
    const snapshot = await query.get();

    let notebooks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        notebookType: data.notebookType || "research_note",
        domainTags: data.skillSpec?.domainTags || data.classification?.tags || [],
        sourceTitle: data.sourceTitle,
        sourceType: data.sourceType,
        applicableAgents: data.applicableAgents || [],
        hasResearch: !!data.researchDossier,
        hasSkillSpec: !!data.skillSpec,
        hasValidation: !!data.validation,
        skillSpec: data.skillSpec ? {
          skillName: data.skillSpec.skillName,
          description: data.skillSpec.description,
          domainTags: data.skillSpec.domainTags,
          migrationComplexity: data.skillSpec.antigravityTranslation?.migrationComplexity,
          buildTime: data.skillSpec.antigravityTranslation?.estimatedBuildTime,
          prerequisites: data.skillSpec.prerequisites,
          buildPlan: data.skillSpec.buildPlan,
          costEstimate: data.skillSpec.costEstimate,
        } : null,
        validation: data.validation ? {
          status: data.validation.overallStatus,
          confidence: data.validation.confidenceScore,
        } : null,
        researchSummary: data.researchDossier
          ? data.researchDossier.map(d => ({
              toolName: d.toolName,
              category: d.category,
              relevanceScore: d.relevanceScore,
            }))
          : [],
        googleTranslation: data.googleTranslation?.mappings || [],
      };
    });

    // Filter by domains if specified
    if (domainsParam && domainsParam !== "all") {
      const requestedDomains = domainsParam.split(",").map(d => d.trim().toLowerCase());
      notebooks = notebooks.filter(nb => {
        const nbDomains = nb.domainTags.map(t => t.toLowerCase());
        return requestedDomains.some(rd =>
          nbDomains.some(nd => nd.includes(rd) || rd.includes(nd))
        );
      });
    }

    // Sort by relevance (has research + validation first)
    notebooks.sort((a, b) => {
      const scoreA = (a.hasResearch ? 2 : 0) + (a.hasSkillSpec ? 2 : 0) + (a.hasValidation ? 1 : 0);
      const scoreB = (b.hasResearch ? 2 : 0) + (b.hasSkillSpec ? 2 : 0) + (b.hasValidation ? 1 : 0);
      return scoreB - scoreA;
    });

    // Limit results
    const limited = notebooks.slice(0, limit);

    // Build knowledge graph edges (notebook → skill connections)
    const graph = {
      nodes: limited.map(nb => ({
        id: nb.id,
        type: "notebook",
        label: nb.name,
        domains: nb.domainTags,
        agents: nb.applicableAgents,
      })),
      edges: [],
    };

    // For each notebook, create edges to applicable agents
    limited.forEach(nb => {
      (nb.applicableAgents || []).forEach(agentId => {
        graph.edges.push({
          from: nb.id,
          to: agentId,
          type: "feeds",
        });
      });
    });

    return Response.json({
      notebooks: limited,
      totalApproved: snapshot.size,
      filtered: limited.length,
      graph,
      domains: [...new Set(notebooks.flatMap(nb => nb.domainTags))],
    });
  } catch (error) {
    console.error("[/api/knowledge/context]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/context
 * Link a notebook to agent skills by domain matching.
 *
 * Body: { notebookId: string } — auto-links based on domain tags
 * Body: { notebookId: string, skillId: string, agentId: string } — manual link
 */
export async function POST(request) {
  try {
    const { notebookId, skillId, agentId } = await request.json();

    if (!notebookId) {
      return Response.json({ error: "notebookId is required" }, { status: 400 });
    }

    const nbDoc = await adminDb.collection("notebooks").doc(notebookId).get();
    if (!nbDoc.exists) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }

    const nbData = nbDoc.data();
    const domainTags = nbData.skillSpec?.domainTags || nbData.classification?.tags || [];

    if (skillId && agentId) {
      // Manual link
      await adminDb.collection("skill_links").doc(`${agentId}_${skillId}_${notebookId}`).set({
        notebookId,
        skillId,
        agentId,
        linkedAt: new Date().toISOString(),
        domains: domainTags,
      });

      return Response.json({
        success: true,
        message: `Linked notebook "${nbData.name}" to ${agentId}/${skillId}`,
      });
    }

    // Auto-link: find matching skills by domain overlap
    // Read agent registry to find skills
    const registryModule = await import("@/../agents/registry.json", { assert: { type: "json" } });
    const registry = registryModule.default;
    const links = [];

    for (const [agentKey, agentData] of Object.entries(registry.agents)) {
      for (const skill of (agentData.skills || [])) {
        // Check domain overlap between notebook tags and skill category
        const skillDomains = [skill.category, skill.id, skill.name.toLowerCase()];
        const overlap = domainTags.filter(tag =>
          skillDomains.some(sd => sd.includes(tag.toLowerCase()) || tag.toLowerCase().includes(sd))
        );

        if (overlap.length > 0) {
          const linkId = `${agentKey}_${skill.id}_${notebookId}`;
          await adminDb.collection("skill_links").doc(linkId).set({
            notebookId,
            notebookName: nbData.name,
            skillId: skill.id,
            skillName: skill.name,
            agentId: agentKey,
            agentName: agentData.displayName,
            linkedAt: new Date().toISOString(),
            domains: domainTags,
            overlapTags: overlap,
          });
          links.push({ agent: agentKey, skill: skill.name, overlap });
        }
      }
    }

    return Response.json({
      success: true,
      notebookId,
      notebookName: nbData.name,
      linksCreated: links.length,
      links,
    });
  } catch (error) {
    console.error("[/api/knowledge/context POST]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
