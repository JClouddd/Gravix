import crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';
import { generate } from '@/lib/geminiClient';
import registry from '@/../agents/registry.json';

const AGENT_ENGINE_URL = process.env.AGENT_ENGINE_URL;
const USE_ADK = process.env.USE_ADK_AGENTS === 'true';

/**
 * Dual-mode agent architecture proxy.
 * Routes requests to either the deployed Agent Engine or falls back to the native Gemini implementation.
 */

/**
 * Routes a message to a specific agent using either ADK Agent Engine or local fallback.
 * @param {string} message The user request message.
 * @param {string} [agentName=null] The name of the specific agent to invoke.
 * @param {Object} [context={}] Additional context to pass.
 * @returns {Promise<Object>} The agent response.
 */
export async function routeToAgent(message, agentName = null, context = {}) {
  if (!USE_ADK) {
    // Fall back to existing Gemini wrapper logic
    let systemPrompt = `You are ${agentName || "an AI agent"}, a specialist agent in Gravix.`;
    let complexity = "flash";
    let grounded = false;

    if (agentName) {
      const agentConfig = registry.agents[agentName];
      if (agentConfig) {
        systemPrompt = `You are ${agentConfig.displayName}, a specialist agent in Gravix. ${agentConfig.role}`;
      }

      if (agentName === 'scholar') {
        complexity = 'pro';
        grounded = true;
      } else if (agentName === 'sentinel') {
        grounded = true;
      }
    }

    const result = await generate({
      prompt: message,
      systemPrompt,
      complexity,
      grounded,
    });

    return {
      agent: agentName || 'unknown',
      status: 'ok',
      response: result.text,
      model: result.model,
      tokens: result.tokens,
      source: 'gemini_fallback'
    };
  } else {
    // Call ADK Agent Engine
    if (!AGENT_ENGINE_URL) {
      throw new Error("AGENT_ENGINE_URL is not set");
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(AGENT_ENGINE_URL);

    const url = agentName
      ? `${AGENT_ENGINE_URL}/agents/${agentName}/invoke`
      : `${AGENT_ENGINE_URL}/agents/invoke`;

    const sessionId = crypto.randomUUID();

    const res = await client.request({
      url,
      method: 'POST',
      data: {
        message,
        sessionId,
        context
      }
    });

    return {
      ...res.data,
      source: 'agent_engine'
    };
  }
}

/**
 * Retrieves the status of all available agents.
 * @returns {Promise<Array<Object>>} List of agent statuses.
 */
export async function getAgentStatus() {
  if (!USE_ADK) {
    return Object.entries(registry.agents).map(([id, data]) => ({
      id,
      name: data.displayName,
      status: "active",
      source: 'registry_fallback'
    }));
  } else {
    if (!AGENT_ENGINE_URL) {
      throw new Error("AGENT_ENGINE_URL is not set");
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(AGENT_ENGINE_URL);

    const res = await client.request({
      url: `${AGENT_ENGINE_URL}/agents/status`,
      method: 'GET'
    });

    return res.data;
  }
}

/**
 * Lists the available tools for a specific agent.
 * @param {string} agentName The name of the agent.
 * @returns {Promise<Array<Object>>} List of tools.
 */
export async function listAgentTools(agentName) {
  if (!USE_ADK) {
    // Mock data based on agent name
    const tools = [];
    if (agentName === 'forge') {
      tools.push({ name: 'systemStatus', description: 'Get system status' });
      tools.push({ name: 'costs', description: 'Get system costs' });
    } else if (agentName === 'scholar') {
      tools.push({ name: 'queryKnowledge', description: 'Query knowledge base' });
    } else if (agentName === 'analyst') {
      tools.push({ name: 'executeColab', description: 'Execute colab notebook' });
    } else if (agentName === 'courier') {
      tools.push({ name: 'emailInbox', description: 'Check email inbox' });
    } else if (agentName === 'builder') {
      tools.push({ name: 'julesTasks', description: 'Check jules tasks' });
    } else if (agentName === 'sentinel') {
      tools.push({ name: 'costSummary', description: 'Get cost summary' });
      tools.push({ name: 'costBreakdown', description: 'Get cost breakdown' });
    }

    return tools;
  } else {
    if (!AGENT_ENGINE_URL) {
      throw new Error("AGENT_ENGINE_URL is not set");
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(AGENT_ENGINE_URL);

    const res = await client.request({
      url: `${AGENT_ENGINE_URL}/agents/${agentName}/tools`,
      method: 'GET'
    });

    return res.data;
  }
}
