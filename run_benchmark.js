import fs from 'fs';

// Mock dependencies
const mockSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const mockGoogleApiRequest = async () => {
    await mockSleep(100); // 100ms per request
    return {};
};

const mockAdminDb = {
    collection: () => ({
        add: async () => {
            await mockSleep(50); // 50ms per write
            return { id: "mock_id" };
        }
    })
};

// Data to process
const actionItems = Array(5).fill({ task: "Task", owner: "Owner" });
const followUps = Array(5).fill({ item: "Follow up" });
const decisions = Array(5).fill({ decision: "Decision" });

async function runSequential() {
    console.log("Running sequential...");
    const start = Date.now();
    let tasksCreated = 0;
    let eventsCreated = 0;
    let decisionsStored = 0;

    for (const item of actionItems) {
        await mockGoogleApiRequest();
        tasksCreated++;
    }

    for (const item of followUps) {
        await mockGoogleApiRequest();
        eventsCreated++;
    }

    for (const decision of decisions) {
        await mockAdminDb.collection("meeting_decisions").add({});
        decisionsStored++;
    }
    const end = Date.now();
    console.log(`Sequential execution time: ${end - start}ms`);
}

async function runConcurrent() {
    console.log("Running concurrent...");
    const start = Date.now();
    let tasksCreated = 0;
    let eventsCreated = 0;
    let decisionsStored = 0;

    const taskPromises = actionItems.map(async (item) => {
        await mockGoogleApiRequest();
        tasksCreated++; // simplified counter logic for benchmark
    });

    const eventPromises = followUps.map(async (item) => {
        await mockGoogleApiRequest();
        eventsCreated++;
    });

    const decisionPromises = decisions.map(async (decision) => {
        await mockAdminDb.collection("meeting_decisions").add({});
        decisionsStored++;
    });

    await Promise.all([...taskPromises, ...eventPromises, ...decisionPromises]);

    const end = Date.now();
    console.log(`Concurrent execution time: ${end - start}ms`);
}

async function main() {
    await runSequential();
    await runConcurrent();
}

main();
