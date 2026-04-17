/**
 * POST /api/colab/execute — Execute a notebook
 * GET /api/colab/execute — List available notebooks
 */

import { generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";

const NOTEBOOKS = [
  {
    id: "stock_analysis",
    name: "Stock Analysis",
    description: "Market data, trends, and trading signals",
    icon: "📈",
    runtime: "cpu",
    estimatedDuration: "2-5 min",
    gcsPath: "gs://gravix-knowledge/notebooks/stock_analysis.ipynb",
    parameters: [
      { name: "ticker", type: "string", required: true, description: "Stock ticker symbol" },
      { name: "period", type: "string", default: "1y", description: "Analysis period" },
    ],
  },
  {
    id: "portfolio_optimizer",
    name: "Portfolio Optimizer",
    description: "Asset allocation and rebalancing recommendations",
    icon: "💼",
    runtime: "cpu",
    estimatedDuration: "3-8 min",
    gcsPath: "gs://gravix-knowledge/notebooks/portfolio_optimizer.ipynb",
    parameters: [
      { name: "holdings", type: "array", required: true, description: "Current portfolio holdings" },
      { name: "risk_tolerance", type: "string", default: "moderate", description: "Risk level" },
    ],
  },
  {
    id: "health_trends",
    name: "Health Trends",
    description: "Nutrition and biometric data analysis",
    icon: "❤️",
    runtime: "cpu",
    estimatedDuration: "1-3 min",
    gcsPath: "gs://gravix-knowledge/notebooks/health_trends.ipynb",
    parameters: [
      { name: "date_range", type: "string", default: "30d", description: "Date range for analysis" },
    ],
  },
  {
    id: "document_processor",
    name: "Document Processor",
    description: "Batch NLP processing and entity extraction",
    icon: "📄",
    runtime: "cpu",
    estimatedDuration: "2-10 min",
    gcsPath: "gs://gravix-knowledge/notebooks/document_processor.ipynb",
    parameters: [
      { name: "source", type: "string", required: true, description: "Document source path or URL" },
      { name: "operations", type: "array", default: ["summarize", "entities"], description: "NLP operations" },
    ],
  },
  {
    id: "data_pipeline",
    name: "Data Pipeline",
    description: "Generic ETL workflows for data transformation",
    icon: "🔄",
    runtime: "cpu",
    estimatedDuration: "1-5 min",
    gcsPath: "gs://gravix-knowledge/notebooks/data_pipeline.ipynb",
    parameters: [
      { name: "input_source", type: "string", required: true, description: "Input data source" },
      { name: "output_format", type: "string", default: "json", description: "Output format" },
    ],
  },
];

export async function GET() {
  return Response.json({
    notebooks: NOTEBOOKS.map((nb) => ({
      ...nb,
      status: "available",
      lastRun: null,
    })),
    runtime: {
      available: true,
      message: "Colab Enterprise runtime ready.",
    },
  });
}

export async function POST(request) {
  try {
    const { notebookId, parameters = {} } = await request.json();

    if (!notebookId) {
      return Response.json({ error: "notebookId is required" }, { status: 400 });
    }

    const notebook = NOTEBOOKS.find((nb) => nb.id === notebookId);
    if (!notebook) {
      return Response.json({ error: `Notebook '${notebookId}' not found` }, { status: 404 });
    }

    // Validate required params
    const missing = notebook.parameters
      .filter((p) => p.required && !parameters[p.name])
      .map((p) => p.name);

    if (missing.length > 0) {
      return Response.json({
        error: `Missing required parameters: ${missing.join(", ")}`,
      }, { status: 400 });
    }

    // Determine prompt based on notebook type
    let prompt = "";
    switch (notebookId) {
      case "stock_analysis":
        prompt = `Analyze stock ${parameters.ticker} over ${parameters.period || '1y'}. Provide trend analysis, key support/resistance levels, and trading signals.`;
        break;
      case "portfolio_optimizer":
        const holdingsStr = Array.isArray(parameters.holdings) ? parameters.holdings.join(", ") : parameters.holdings;
        prompt = `Given holdings ${holdingsStr}, suggest optimal allocation for ${parameters.risk_tolerance || 'moderate'} risk tolerance.`;
        break;
      case "health_trends":
        prompt = `Analyze health trends over ${parameters.date_range || '30d'}. Identify patterns and recommendations.`;
        break;
      case "document_processor":
        const opsStr = Array.isArray(parameters.operations) ? parameters.operations.join(", ") : (parameters.operations || 'summarize, entities');
        prompt = `Process document from ${parameters.source}. Perform: ${opsStr}.`;
        break;
      case "data_pipeline":
        prompt = `Transform data from ${parameters.input_source} to ${parameters.output_format || 'json'}.`;
        break;
      default:
        prompt = `Execute analysis for ${notebookId} with parameters: ${JSON.stringify(parameters)}`;
    }

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

    return Response.json({
      executionId: `exec_${Date.now()}`,
      notebook: notebook.name,
      parameters,
      status: "completed",
      estimatedDuration: notebook.estimatedDuration,
      result: result.text,
      metadata: {
        model: result.model,
        tokens: result.tokens,
        duration: result.duration,
      }
    });
  } catch (error) {
    console.error("[/api/colab/execute]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
