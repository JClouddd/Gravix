/**
 * @fileoverview geminiClient.js — Centralized Gemini API Client
 * This module provides a unified interface for interacting with the Google Gemini API.
 *
 * Features:
 * - Auto-complexity routing (Flash / Pro / Deep Research)
 * - Google Search grounding toggle
 * - Structured JSON output
 * - Deep Research mode
 * - Retry with exponential backoff
 * - Token tracking and cost estimation
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

/**
 * Estimates the cost of a Gemini API call based on model tier and token counts.
 *
 * @description
 * Calculates the estimated cost for input and output tokens for a given model tier.
 * It also determines if the cost is low enough to auto-approve or high enough to warn.
 *
 * @param {string} modelTier - The model tier to use ("flash", "pro", or "deep").
 * @param {number} inputTokens - The number of input tokens.
 * @param {number} [estimatedOutputTokens=500] - The estimated number of output tokens.
 * @returns {{
 *   modelTier: string,
 *   inputTokens: number,
 *   estimatedOutputTokens: number,
 *   inputCost: number,
 *   outputCost: number,
 *   totalCost: number,
 *   autoApprove: boolean,
 *   warning: boolean
 * }} The estimated cost details.
 *
 * @example
 * const costEstimate = estimateCost("pro", 1000, 200);
 * console.log(costEstimate.totalCost); // 0.00325
 */
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

/**
 * Main function to generate content using the Gemini API.
 *
 * @description
 * Generates text content using a specified or automatically selected Gemini model.
 * It handles model routing, structured JSON output formatting, Google Search grounding,
 * deep reasoning, and retry logic with exponential backoff.
 *
 * @param {Object} options - Options for content generation.
 * @param {string} options.prompt - The main input prompt.
 * @param {string} [options.systemPrompt=""] - Optional system instructions.
 * @param {("auto"|"low"|"flash"|"high"|"pro"|"deep"|"research")} [options.complexity="auto"] - Determines which model to use.
 * @param {boolean} [options.grounded=false] - Whether to use Google Search grounding.
 * @param {Object|null} [options.jsonSchema=null] - Optional JSON schema for structured output.
 * @param {("max"|"high"|"medium"|null)} [options.thinkingLevel=null] - Thinking budget for deep reasoning models.
 * @param {number} [options.maxTokens=8192] - Maximum number of output tokens.
 * @param {number|null} [options.temperature=null] - Optional temperature for generation (0.0 to 2.0).
 * @param {Array<{role: string, content: string}>} [options.history=[]] - Optional conversation history.
 * @returns {Promise<{
 *   text: string,
 *   model: string,
 *   modelTier: string,
 *   tokens: {input: number, output: number, total: number},
 *   cost: Object,
 *   duration: number,
 *   grounded: boolean,
 *   groundingMetadata: Object|null
 * }>} The generated response and metadata.
 *
 * @example
 * const response = await generate({
 *   prompt: "Explain quantum computing in simple terms.",
 *   complexity: "low"
 * });
 * console.log(response.text);
 */
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

/**
 * Convenience wrapper around generate() for handling chat conversations.
 *
 * @description
 * Processes a single chat message within the context of an existing conversation history.
 *
 * @param {Object} options - Options for the chat session.
 * @param {string} options.message - The user's new chat message.
 * @param {Array<{role: string, content: string}>} [options.history=[]] - Previous conversation history.
 * @param {string} [options.systemPrompt=""] - Optional system instructions.
 * @param {("auto"|"low"|"flash"|"high"|"pro"|"deep"|"research")} [options.complexity="auto"] - Determines which model to use.
 * @param {boolean} [options.grounded=false] - Whether to use Google Search grounding.
 * @returns {Promise<{
 *   text: string,
 *   model: string,
 *   modelTier: string,
 *   tokens: {input: number, output: number, total: number},
 *   cost: Object,
 *   duration: number,
 *   grounded: boolean,
 *   groundingMetadata: Object|null
 * }>} The generated response and metadata.
 *
 * @example
 * const response = await chat({
 *   message: "How does it work?",
 *   history: [{ role: "user", content: "Tell me about photosynthesis." }, { role: "model", content: "It's how plants make food." }]
 * });
 * console.log(response.text);
 */
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

/**
 * Executes a query with Google Search grounding enabled.
 *
 * @description
 * Generates an answer to a query, using Google Search to ground the response
 * in current, factual information. Always uses the "pro" complexity tier.
 *
 * @param {Object} options - Options for the grounded query.
 * @param {string} options.query - The search query or question.
 * @param {string} [options.systemPrompt="You are a helpful research assistant. Provide accurate, well-sourced answers."] - System instructions.
 * @returns {Promise<{
 *   text: string,
 *   model: string,
 *   modelTier: string,
 *   tokens: {input: number, output: number, total: number},
 *   cost: Object,
 *   duration: number,
 *   grounded: boolean,
 *   groundingMetadata: Object|null
 * }>} The generated response and metadata, including grounding data.
 *
 * @example
 * const response = await groundedQuery({
 *   query: "What is the current stock price of Google?"
 * });
 * console.log(response.text);
 */
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

/**
 * Conducts deep research on a topic using extended reasoning and search grounding.
 *
 * @description
 * Uses the "deep" model tier with a "high" thinking budget and Google Search grounding
 * to provide a comprehensive, multi-perspective analysis on a given topic.
 *
 * @param {Object} options - Options for the deep research session.
 * @param {string} options.topic - The research topic or question.
 * @param {string} [options.systemPrompt="You are a deep research analyst. Provide comprehensive, multi-perspective analysis with citations."] - System instructions.
 * @returns {Promise<{
 *   text: string,
 *   model: string,
 *   modelTier: string,
 *   tokens: {input: number, output: number, total: number},
 *   cost: Object,
 *   duration: number,
 *   grounded: boolean,
 *   groundingMetadata: Object|null
 * }>} The generated response and metadata, including extensive grounding data.
 *
 * @example
 * const research = await deepResearch({
 *   topic: "The impact of artificial intelligence on modern healthcare."
 * });
 * console.log(research.text);
 */
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

/**
 * Generates content structured to match a specific JSON schema.
 *
 * @description
 * Forces the model to output valid JSON conforming to the provided schema.
 * Useful for extracting data or ensuring consistent API responses.
 *
 * @param {Object} options - Options for structured generation.
 * @param {string} options.prompt - The input prompt.
 * @param {Object} options.schema - The JSON schema the output must adhere to.
 * @param {string} [options.systemPrompt=""] - Optional system instructions.
 * @param {("auto"|"low"|"flash"|"high"|"pro"|"deep"|"research")} [options.complexity="auto"] - Determines which model to use.
 * @returns {Promise<{
 *   text: string,
 *   model: string,
 *   modelTier: string,
 *   tokens: {input: number, output: number, total: number},
 *   cost: Object,
 *   duration: number,
 *   grounded: boolean,
 *   groundingMetadata: Object|null
 * }>} The generated response and metadata. The `text` property will contain the JSON string.
 *
 * @example
 * const schema = {
 *   type: "object",
 *   properties: {
 *     recipeName: { type: "string" },
 *     ingredients: { type: "array", items: { type: "string" } }
 *   }
 * };
 * const response = await structuredGenerate({
 *   prompt: "Give me a recipe for chocolate chip cookies.",
 *   schema
 * });
 * const recipe = JSON.parse(response.text);
 */
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
