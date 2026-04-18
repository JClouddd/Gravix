import { POST } from './src/app/api/automation/meeting-pipeline/route.js';

async function run() {
  const req = {
    json: async () => ({
      meetingId: "test-meeting-123",
      transcript: "This is a test transcript",
      analysis: {
        actionItems: [
          { task: "Task 1", owner: "Alice" },
          { task: "Task 2", owner: "Bob" }
        ],
        followUps: [
          { item: "Follow up 1" },
          { item: "Follow up 2" },
          { item: "Follow up 3" },
          { item: "Follow up 4" },
          { item: "Follow up 5" },
        ],
        decisions: [
          { decision: "Decision 1" },
          { decision: "Decision 2" }
        ]
      }
    })
  };

  const start = Date.now();
  const res = await POST(req);
  const end = Date.now();
  console.log(`Execution time: ${end - start}ms`);
  const data = await res.json();
  console.log(data);
}

// Mocking dependencies to avoid actual API calls and DB queries
import * as adminDbMock from './src/lib/firebaseAdmin.js';
import * as googleAuthMock from './src/lib/googleAuth.js';
import * as geminiClientMock from './src/lib/geminiClient.js';

// Setup mocks if possible, or create a mock module replacement script.
