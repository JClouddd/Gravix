/**
 * Agent Spawner routing core
 *
 * Dynamic model router that routes to gemini-2.5-flash for orchestration routing,
 * and gemini-2.5-pro for heavy execution workloads to enable token arbitrage.
 */

const { Sandbox } = require('@e2b/code-interpreter');

async function execute_sandbox_code({ code }) {
  const sandbox = await Sandbox.create();
  try {
    const execution = await sandbox.runCode(code);
    return execution;
  } finally {
    await sandbox.kill();
  }
}

function routeModel(complexity) {
  const heavyWorkloads = ['high', 'pro', 'heavy', 'deep', 'complex'];

  if (complexity && heavyWorkloads.includes(complexity.toLowerCase())) {
    return 'gemini-2.5-pro';
  }

  // Default to gemini-2.5-flash for orchestration routing and token arbitrage
  return 'gemini-2.5-flash';
}

function spawnAgent(task) {
  const complexity = task?.complexity || 'low';
  const assignedModel = routeModel(complexity);

  const agentData = {
    taskId: task?.id || `task-${Date.now()}`,
    assignedModel,
    taskData: task,
    status: 'spawned'
  };

  const agentProfile = task?.agentProfile || task?.agent || '';
  if (['builder', 'analyst'].includes(agentProfile.toLowerCase())) {
    agentData.tools = [
      {
        name: 'execute_sandbox_code',
        description: 'Execute Python code in a stateful sandbox environment.',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The Python code to execute.'
            }
          },
          required: ['code']
        },
        execute: execute_sandbox_code
      }
    ];
  }

  return agentData;
}

module.exports = {
  routeModel,
  spawnAgent,
  execute_sandbox_code
};
