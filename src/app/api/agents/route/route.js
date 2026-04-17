import { NextResponse } from 'next/server';
import { generate } from '@/lib/geminiClient';

/**
 * POST /api/agents/route
 * Conductor agent — receives a natural language request and routes it
 * to the appropriate specialist agent.
 *
 * Body: { message: string, context?: object }
 * Returns: { agent, reasoning, action, response }
 */
export async function POST(request) {
  try {
    const { message, context = {} } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'message required' },
        { status: 400 }
      );
    }

    // Conductor uses a system prompt that knows about all agents
    const routingPrompt = `You are Conductor, the orchestrator agent for Gravix.
Your job is to analyze the user's request and decide which specialist agent should handle it.

Available agents:
1. FORGE — Code generation, debugging, architecture. Use for: "build X", "fix this bug", "refactor Y"
2. SCHOLAR — Research, knowledge retrieval, document analysis. Use for: "what is X", "find info about Y", "summarize this"
3. ANALYST — Data analysis, cost reports, metrics. Use for: "show costs", "analyze performance", "generate report"
4. COURIER — Email drafting, calendar management, communications. Use for: "write email", "schedule meeting", "send message"
5. SENTINEL — System monitoring, security, health checks. Use for: "check status", "is X running", "security audit"
6. BUILDER — Project scaffolding, deployments, CI/CD. Use for: "create project", "deploy to prod", "set up CI"

Respond in this exact JSON format:
{
  "agent": "<agent_name>",
  "reasoning": "<why you chose this agent>",
  "action": "<what the agent should do>",
  "confidence": <0.0-1.0>
}

User context: ${JSON.stringify(context)}
User request: "${message}"`;

    const result = await generate({
      prompt: routingPrompt,
      complexity: 'low', // routing is a fast decision
      systemInstruction: 'You are an intelligent request router. Always respond with valid JSON.',
    });

    // Parse the routing decision
    let decision;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      decision = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      decision = {
        agent: 'SCHOLAR',
        reasoning: 'Could not parse routing decision, defaulting to Scholar',
        action: message,
        confidence: 0.5,
      };
    }

    // If confidence is high enough, generate the actual response
    let agentResponse = null;
    if (decision && decision.confidence >= 0.7) {
      const agentPrompt = `You are ${decision.agent}, a specialist agent in the Gravix system.
Your task: ${decision.action}
User's original request: "${message}"

Provide a helpful, concise response.`;

      agentResponse = await generate({
        prompt: agentPrompt,
        complexity: 'medium',
      });
    }

    return NextResponse.json({
      routing: decision,
      response: agentResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
