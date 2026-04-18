import { performance } from 'perf_hooks';
import fs from 'fs';

// Mock fetch
global.fetch = async () => {
  await new Promise(r => setTimeout(r, 50)); // simulate 50ms network delay
  return { ok: true, json: async () => ({}) };
};

// Mock adminDb
const mockAdd = async () => {
  await new Promise(r => setTimeout(r, 50)); // simulate 50ms db delay
  return {};
};
const mockBatch = {
  set: () => {},
  commit: async () => {
    await new Promise(r => setTimeout(r, 50)); // simulate 50ms batch delay
  }
};

const mockDoc = {
  get: async () => ({
    exists: true,
    data: () => ({ accessToken: 'mock_token', expiresAt: Date.now() + 10000 })
  }),
  update: async () => {},
  set: () => {}
};

const mockCollection = {
  doc: (id) => {
    mockDoc.id = id;
    return mockDoc;
  },
  add: mockAdd
};

const mockAdminDb = {
  collection: () => mockCollection,
  batch: () => mockBatch
};

// Instead of import, we'll read the code and eval it, replacing imports.
async function run() {
  const code = fs.readFileSync('./src/app/api/automation/email-pipeline/route.js', 'utf-8');
  let cleanedCode = code
    .replace('import { adminDb } from "@/lib/firebaseAdmin";', '')
    .replace('import { refreshAccessToken } from "@/lib/googleAuth";', '')
    .replace('export async function POST', 'async function POST');

  const executionContext = `
    const adminDb = mockAdminDb;
    const refreshAccessToken = async () => ({ access_token: 'refreshed', expires_in: 3600 });
    const Response = {
      json: (data, opts) => ({ json: async () => data, status: opts?.status || 200 })
    };

    ${cleanedCode}

    return POST;
  `;

  const POST = new Function('mockAdminDb', executionContext)(mockAdminDb);

  const emails = Array.from({ length: 20 }).map((_, i) => ({
    id: `email_${i}`,
    from: 'test@example.com',
    subject: i % 2 === 0 ? 'invoice for services' : 'regular email',
    snippet: 'here is the email',
    category: i % 3 === 0 ? 'action-required' : (i % 3 === 1 ? 'client' : 'invoice'),
    urgency: i % 4 === 0 ? 'high' : 'normal'
  }));

  const request = {
    json: async () => ({ emails })
  };

  const start = performance.now();
  const res = await POST(request);
  const data = await res.json();
  const end = performance.now();

  console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
  console.log(`Result:`, data);
}

run().catch(console.error);
