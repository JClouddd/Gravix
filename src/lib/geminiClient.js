/**
 * geminiClient.js — Centralized Gemini API Client
 *
 * Features:
 * - Auto-complexity routing (Flash / Pro / Deep Research)
 * - Google Search grounding toggle
 * - Structured JSON output
 * - Deep Research mode
 * - Retry with exponential backoff
 * - Token tracking → Firestore
 * - Cost estimation before expensive calls
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/* ── Model Definitions ────────────────────────────────────────── */
const MODELS = {
  flash: "gemini-2.5-flash-preview-05-20",
  pro: "gemini-2.5-pro-preview-05-06",
  deep: "gemini-2.5-pro-preview-05-06", // Deep Research uses Pro with extended thinking
};

const MODEL_COSTS = {
  // Per 1M tokens (input / output)
  flash: { input: 0.15, output: 0.60 },
  pro: { input: 1.25, output: 10.00 },
  deep: { input: 1.25, output: 10.00 },
};

/* ── Complexity Router ────────────────────────────────────────── */
function routeComplexity(complexity = "auto", promptLength = 0) {
  if (complexity === "low" || complexity === "flash") return "flash";
  if (complexity === "high" || complexity === "pro") return "pro";
  if (complexity === "deep" || complexity === "research") return "deep";

  // Auto-route based on prompt length
  if (promptLength > 8000) return "pro";
  if (promptLength > 2000) return "pro";
  return "flash";
}

/* ── Cost Estimator ───────────────────────────────────────────── */
export function estimateCost(modelTier, inputTokens, estimatedOutputTokens = 500) {
  const costs = MODEL_COSTS[modelTier] || MODEL_COSTS.flash;
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (estimatedOutputTokens / 1_000_000) * costs.output;
  return {
    modelTier,
    inputTokens,
    estimatedOutputTokens,
    inputCost: parseFloat(inputCost.toFixed(6)),
    outputCost: parseFloat(outputCost.toFixed(6)),
    totalCost: parseFloat((inputCost + outputCost).toFixed(6)),
    autoApprove: inputCost + outputCost < 0.001, // Auto-approve under $0.001
    warning: inputCost + outputCost > 0.05, // Warn above $0.05
  };
}

/* ── Retry with Backoff ───────────────────────────────────────── */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/* ── Main Generation Function ─────────────────────────────────── */
export async function generate({
  prompt,
  systemPrompt = "",
  complexity = "auto",
  grounded = false,
  jsonSchema = null,
  thinkingLevel = null,
  maxTokens = 8192,
  temperature = null,
  history = [],
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Route to appropriate model
  const promptLength = (systemPrompt + prompt).length;
  const modelTier = routeComplexity(complexity, promptLength);
  const modelName = MODELS[modelTier];

  // Build generation config
  const generationConfig = {
    maxOutputTokens: maxTokens,
  };

  if (temperature !== null) {
    generationConfig.temperature = temperature;
  }

  // Structured JSON output
  if (jsonSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = jsonSchema;
  }

  // Thinking level for deep reasoning
  if (thinkingLevel || modelTier === "deep") {
    generationConfig.thinkingConfig = {
      thinkingBudget: thinkingLevel === "max" ? 24576 :
                      thinkingLevel === "high" ? 16384 :
                      thinkingLevel === "medium" ? 8192 : 4096,
    };
  }

  // Build tools
  const tools = [];
  if (grounded) {
    tools.push({ googleSearchRetrieval: {} });
  }

  // Initialize model
  const modelConfig = {
    model: modelName,
    generationConfig,
    ...(systemPrompt && { systemInstruction: systemPrompt }),
    ...(tools.length > 0 && { tools }),
  };

  const model = genAI.getGenerativeModel(modelConfig);

  // Build contents
  const contents = [];

  // Add history
  for (const msg of history) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.content }],
    });
  }

  // Add current prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  // Execute with retry
  const startTime = Date.now();

  const result = await withRetry(async () => {
    return await model.generateContent({ contents });
  });

  const duration = Date.now() - startTime;
  const response = result.response;
  const text = response.text();

  // Extract token usage
  const usage = response.usageMetadata || {};
  const inputTokens = usage.promptTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount || 0;
  const totalTokens = usage.totalTokenCount || 0;

  // Calculate actual cost
  const cost = estimateCost(modelTier, inputTokens, outputTokens);

  // Extract grounding metadata if available
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

  return {
    text,
    model: modelName,
    modelTier,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost,
    duration,
    grounded: !!groundingMetadata,
    groundingMetadata,
  };
}

/* ── Chat Session ─────────────────────────────────────────────── */
export async function chat({
  message,
  history = [],
  systemPrompt = "",
  complexity = "auto",
  grounded = false,
}) {
  return generate({
    prompt: message,
    systemPrompt,
    complexity,
    grounded,
    history,
  });
}

/* ── Grounded Search Query ────────────────────────────────────── */
export async function groundedQuery({
  query,
  systemPrompt = "You are a helpful research assistant. Provide accurate, well-sourced answers.",
}) {
  return generate({
    prompt: query,
    systemPrompt,
    complexity: "pro",
    grounded: true,
  });
}

/* ── Deep Research ────────────────────────────────────────────── */
export async function deepResearch({
  topic,
  systemPrompt = "You are a deep research analyst. Provide comprehensive, multi-perspective analysis with citations.",
}) {
  return generate({
    prompt: topic,
    systemPrompt,
    complexity: "deep",
    grounded: true,
    thinkingLevel: "high",
    maxTokens: 16384,
  });
}

/* ── Structured Output ────────────────────────────────────────── */
export async function structuredGenerate({
  prompt,
  schema,
  systemPrompt = "",
  complexity = "auto",
}) {
  return generate({
    prompt,
    systemPrompt,
    complexity,
    jsonSchema: schema,
  });
}

export default {
  generate,
  chat,
  groundedQuery,
  deepResearch,
  structuredGenerate,
  estimateCost,
};
