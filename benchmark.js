import { POST } from './src/app/api/automation/email-pipeline/route.js';

// Mock request
const mockRequest = (body) => ({
  json: async () => body,
});

async function run() {
  const emails = [];
  for (let i = 0; i < 50; i++) {
    emails.push({
      id: `email-${i}`,
      from: `user${i}@example.com`,
      subject: `Invoice ${i}`,
      snippet: `Here is your invoice`,
      category: 'client',
      urgency: 'normal',
    });
  }

  const start = Date.now();
  const res = await POST(mockRequest({ emails }));
  const data = await res.json();
  const end = Date.now();
  console.log(`Time taken: ${end - start}ms`, data);
}

run();
