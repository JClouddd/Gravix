import { VertexSwarm } from '@/lib/vertexSwarm';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(req) {
  try {
    const { input, state, orchestratorId } = await req.json();

    if (!input || !orchestratorId) {
      return Response.json(
        { error: 'input and orchestratorId are required' },
        { status: 400 }
      );
    }

    const swarm = new VertexSwarm();
    const orchestrator = swarm.initOrchestrator(orchestratorId);

    // Pass state with zero latency
    const result = await orchestrator.query(input, state || {});

    return Response.json(result);
  } catch (error) {
    console.error('[/api/agents/orchestrator]', error);
    logRouteError('agent', '/api/agents/orchestrator error', error, '/api/agents/orchestrator');
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
