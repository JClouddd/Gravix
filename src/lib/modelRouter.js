/**
 * Model Router — Phase 1.6
 *
 * Selects the cheapest model capable of each task.
 * Every operation is mapped to a model tier based on complexity.
 */

// Pricing per 1M tokens (input/output) or per unit
const MODEL_PRICING = {
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.30, label: "Flash-Lite" },
  "gemini-2.5-flash": { input: 0.15, output: 0.60, label: "Flash" },
  "gemini-2.5-pro": { input: 3.50, output: 10.50, label: "Pro" },
  "text-embedding-005": { perKChars: 0.00006, label: "Embedding" },
  "imagen-4": { perImage: 0.04, label: "Imagen 4" },
  "veo-3.1": { perSecond: 0.35, label: "Veo 3.1" },
  "lyria-3-pro": { perSecond: 0.05, label: "Lyria 3 Pro" },
};

// Task → model mapping: always use the cheapest capable model
const TASK_ROUTES = {
  // Flash-Lite tasks (simple pattern matching, no reasoning)
  entity_extraction: "gemini-2.5-flash-lite",
  tag_classification: "gemini-2.5-flash-lite",
  category_assignment: "gemini-2.5-flash-lite",
  title_extraction: "gemini-2.5-flash-lite",
  sentiment_analysis: "gemini-2.5-flash-lite",
  format_conversion: "gemini-2.5-flash-lite",

  // Flash tasks (reasoning needed, but not deep analysis)
  rag_generation: "gemini-2.5-flash",
  judge_scoring: "gemini-2.5-flash",
  summarization: "gemini-2.5-flash",
  question_answering: "gemini-2.5-flash",
  code_generation: "gemini-2.5-flash",
  context_injection: "gemini-2.5-flash",
  grounded_search: "gemini-2.5-flash",

  // Pro tasks (complex multi-factor reasoning)
  niche_analysis: "gemini-2.5-flash", // Downgraded to flash to avoid 503 High Demand errors
  strategy_planning: "gemini-2.5-pro",
  competitor_analysis: "gemini-2.5-pro",
  content_script: "gemini-2.5-pro",
  architecture_review: "gemini-2.5-pro",

  // Media generation
  thumbnail_generation: "imagen-4",
  video_generation: "veo-3.1",
  music_generation: "lyria-3-pro",
  embedding_generation: "text-embedding-005",
};

/**
 * Get the model for a given task.
 *
 * @param {string} task - Task identifier (e.g., "rag_generation", "entity_extraction")
 * @returns {{ model: string, pricing: object, label: string }}
 */
export function getModelForTask(task) {
  const model = TASK_ROUTES[task] || "gemini-2.5-flash";
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gemini-2.5-flash"];
  return { model, pricing, label: pricing.label };
}

/**
 * Estimate cost for a task given token counts.
 *
 * @param {string} task - Task identifier
 * @param {number} inputTokens - Estimated input tokens
 * @param {number} outputTokens - Estimated output tokens
 * @returns {{ model: string, estimatedCost: number, label: string }}
 */
export function estimateTaskCost(task, inputTokens = 0, outputTokens = 0) {
  const { model, pricing, label } = getModelForTask(task);

  let estimatedCost = 0;
  if (pricing.input && pricing.output) {
    estimatedCost =
      (inputTokens * pricing.input) / 1_000_000 +
      (outputTokens * pricing.output) / 1_000_000;
  } else if (pricing.perImage) {
    estimatedCost = pricing.perImage;
  } else if (pricing.perSecond) {
    estimatedCost = pricing.perSecond * (outputTokens || 1); // outputTokens = seconds for media
  } else if (pricing.perKChars) {
    estimatedCost = pricing.perKChars * (inputTokens / 1000);
  }

  return { model, estimatedCost, label };
}

/**
 * Get the thinking budget for adaptive thinking_level.
 *
 * @param {string} task - Task identifier
 * @param {string} override - Manual override ("low", "medium", "high", "auto")
 * @returns {number} Thinking budget (0 = disabled)
 */
export function getThinkingBudget(task, override = "auto") {
  if (override !== "auto") {
    const budgets = { low: 512, medium: 2048, high: 8192, none: 0 };
    return budgets[override] || 2048;
  }

  // Auto: simple tasks get no/low thinking, complex get high
  const model = TASK_ROUTES[task] || "gemini-2.5-flash";
  if (model === "gemini-2.5-flash-lite") return 0;
  if (model === "gemini-2.5-pro") return 8192;
  return 2048; // Flash default
}

/**
 * Get all available task names for documentation/UI.
 */
export function getTaskCatalog() {
  return Object.entries(TASK_ROUTES).map(([task, model]) => ({
    task,
    model,
    label: MODEL_PRICING[model]?.label || model,
  }));
}

export { MODEL_PRICING, TASK_ROUTES };
