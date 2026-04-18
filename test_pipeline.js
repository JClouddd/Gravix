import { performance } from 'perf_hooks';

// Mock dependencies directly to avoid module resolution issues
const mockAdminDb = {
  collection: () => ({
    doc: () => ({
      get: async () => ({
        exists: true,
        data: () => ({ accessToken: "test_token", expiresAt: Date.now() + 10000 })
      }),
      update: async () => {}
    }),
    add: async () => {}
  })
};

const mockGoogleApiRequest = async (token, url, opts) => {
    return new Promise((resolve) => setTimeout(resolve, 50)); // Mock 50ms network request
};

const mockGenerate = async () => "Draft email body.";

async function POST_simulated(actionItemsCount) {
    let tasksCreated = 0;
    const actionItems = Array(actionItemsCount).fill({ task: "Task", owner: "User" });

    // Create Tasks
    for (const item of actionItems) {
      try {
        const taskPayload = {
          title: item.task || "Meeting Action Item",
          notes: `From meeting: test\nOwner: ${item.owner || "Unassigned"}`,
        };

        await mockGoogleApiRequest(
          "token",
          "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
          {
            method: "POST",
            body: JSON.stringify(taskPayload),
          }
        );
        tasksCreated++;
      } catch (err) {
        console.error("Failed to create task", err);
      }
    }
    return tasksCreated;
}

async function POST_optimized(actionItemsCount) {
    let tasksCreated = 0;
    const actionItems = Array(actionItemsCount).fill({ task: "Task", owner: "User" });

    // Create Tasks
    const taskPromises = actionItems.map(async (item) => {
      try {
        const taskPayload = {
          title: item.task || "Meeting Action Item",
          notes: `From meeting: test\nOwner: ${item.owner || "Unassigned"}`,
        };

        await mockGoogleApiRequest(
          "token",
          "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
          {
            method: "POST",
            body: JSON.stringify(taskPayload),
          }
        );
        tasksCreated++;
      } catch (err) {
        console.error("Failed to create task", err);
      }
    });

    await Promise.all(taskPromises);

    return tasksCreated;
}


async function runBenchmark() {
    console.log("Starting benchmark...");
    const itemsCount = 20; // 20 tasks

    let startTime = performance.now();
    await POST_simulated(itemsCount);
    let endTime = performance.now();
    console.log(`Baseline Execution time (Sequential): ${endTime - startTime} ms`);

    startTime = performance.now();
    await POST_optimized(itemsCount);
    endTime = performance.now();
    console.log(`Optimized Execution time (Concurrent): ${endTime - startTime} ms`);
}

runBenchmark();
