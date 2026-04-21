/**
 * Agent Spawner routing core
 *
 * Dynamic model router that routes to gemini-2.5-flash for orchestration routing,
 * and gemini-2.5-pro for heavy execution workloads to enable token arbitrage.
 */

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

  return {
    taskId: task?.id || `task-${Date.now()}`,
    assignedModel,
    taskData: task,
    status: 'spawned'
  };
}

module.exports = {
  routeModel,
  spawnAgent
};
