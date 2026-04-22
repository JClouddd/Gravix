import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/colab/execute
 * Returns notebooks available for execution and pending ones.
 */
export async function GET() {
  try {
    const snapshot = await adminDb.collection("notebooks").get();

    const notebooks = [];
    const pendingNotebooks = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const notebook = {
        id: doc.id,
        name: data.name,
        description: data.description,
        notebookType: data.notebookType,
        parameters: data.parameters || [],
        expectedOutputs: data.expectedOutputs,
        estimatedCost: data.estimatedCost,
        sourceTitle: data.sourceTitle,
        sourceType: data.sourceType,
        status: data.status,
      };

      if (data.status === "approved") {
        notebooks.push(notebook);
      } else if (data.status === "pending") {
        pendingNotebooks.push({ ...notebook, ...data });
      }
    });

    return Response.json({ notebooks, pendingNotebooks });
  } catch (error) {
    logRouteError("colab", "/api/colab/execute GET error", error, "/api/colab/execute");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/colab/execute
 * Executes a notebook using Gemini with the Code Execution tool natively enabled.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { notebookId, parameters = {} } = body;

    if (!notebookId) {
      return Response.json({ error: "notebookId is required" }, { status: 400 });
    }

    const doc = await adminDb.collection("notebooks").doc(notebookId).get();
    if (!doc.exists) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }

    const notebook = doc.data();

    // Prepare prompt with parameters
    let prompt = notebook.analysisPrompt || notebook.description || "Execute this notebook.";
    prompt += "\n\nParameters provided by user:\n";
    for (const [key, value] of Object.entries(parameters)) {
      prompt += `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}\n`;
    }
    prompt += "\n\nPlease write and run python code to analyze this data and produce plots or charts where applicable. Return your findings.";

    // Execute via Gemini with native code execution
    const result = await generate({
      prompt,
      complexity: "pro", // using pro for code execution
      codeExecution: true
    });

    // Parse the execution result
    // Extract base64 images from codeExecutionResult or we can parse text output.
    const chartUrls = [];

    if (result.text) {
      // Sometimes images are encoded directly in markdown by Gemini with Code Execution
      // Using regex to find image base64
      const imageMatches = [...result.text.matchAll(/data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)/g)];
      for (const match of imageMatches) {
          chartUrls.push(match[0]);
      }
    }


    return Response.json({
      notebook: notebook.name,
      parameters,
      executionTime: result.duration,

      results: result.text + (result.codeExecutionResult ? "\n\n[Code Execution Output]\n" + result.codeExecutionResult.output : ""),
      executableCode: result.executableCode ? result.executableCode.code : null,

      chartUrls: chartUrls, // Assuming charts might need further parsing, we will enhance this
    });

  } catch (error) {
    logRouteError("colab", "/api/colab/execute POST error", error, "/api/colab/execute");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
