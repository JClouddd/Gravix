import fs from 'fs';

let content = fs.readFileSync('src/app/api/colab/execute/route.js', 'utf8');

const postHandler = `
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch(e) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const notebookId = body.notebook || body.notebookId;
    const parameters = body.parameters || {};

    if (!notebookId) {
      return Response.json({ error: "notebook/notebookId is required" }, { status: 400 });
    }

    const notebook = NOTEBOOKS.find((nb) => nb.id === notebookId);
    if (!notebook) {
      return Response.json({ error: \`Notebook '\${notebookId}' not found\` }, { status: 404 });
    }

    const targetUrl = 'https://colab-worker-426017291723.us-central1.run.app/execute';

    try {
      // Try Cloud Run Worker
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(targetUrl);

      const startTime = Date.now();
      const response = await client.request({
        url: targetUrl,
        method: 'POST',
        data: { notebook: notebookId, parameters }
      });
      const executionTime = Date.now() - startTime;

      return Response.json({
        results: response.data?.results || response.data,
        chartUrls: response.data?.chartUrls || [],
        executionTime: executionTime,
        notebook: notebook.name,
        costEstimate: notebook.costEstimate
      });
    } catch (workerError) {
      console.warn("[/api/colab/execute] Worker failed or auth unavailable, falling back to Gemini:", workerError.message);

      // Validate required params for fallback prompt
      const missing = notebook.parameters
        .filter((p) => p.required && !parameters[p.name])
        .map((p) => p.name);

      if (missing.length > 0) {
        return Response.json({
          error: \`Missing required parameters: \${missing.join(", ")}\`,
        }, { status: 400 });
      }

      const startTime = Date.now();
      const prompt = \`Execute analysis for \${notebookId} with parameters: \${JSON.stringify(parameters)}\`;

      // Execute with Gemini
      const result = await generate({ prompt, complexity: "pro" });

      // Log usage
      await logUsage({
        route: "/api/colab/execute",
        model: result.model,
        modelTier: result.modelTier,
        inputTokens: result.tokens.input,
        outputTokens: result.tokens.output,
        totalTokens: result.tokens.total,
        cost: result.cost,
        agent: "analyst",
      });

      const executionTime = Date.now() - startTime;

      return Response.json({
        results: result.text,
        chartUrls: [],
        executionTime: executionTime,
        notebook: notebook.name,
        costEstimate: notebook.costEstimate
      });
    }
  } catch (error) {
    console.error("[/api/colab/execute]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
`;

content = content.replace(/export async function POST\(request\) \{[\s\S]*\}\s*$/m, postHandler.trim());

fs.writeFileSync('src/app/api/colab/execute/route.js', content);
console.log('patched POST handler');
