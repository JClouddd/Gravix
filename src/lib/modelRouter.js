/**
 * Omni-Widget Model Router — Phase 2.0
 *
 * Implements the 5-Layer Orchestration Matrix:
 * 1. Edge: gemini-nano (Local)
 * 2. Brain: gemini-3.1-flash-lite (Intent Routing)
 * 3. Worker: gemma-4 (Zero-cost Heavy Lifting)
 * 4. Architect: gemini-3.1-pro (Deep Reasoning)
 * 5. Artists: veo-3.1, nano-banana-pro (Media Gen)
 */

// Pricing per 1M tokens (input/output) or per unit
const MODEL_PRICING = {
  "gemini-nano": { input: 0.0, output: 0.0, label: "Nano (Edge)" },
  "gemma-4": { input: 0.0, output: 0.0, label: "Gemma 4 (Worker)" }, // Assuming self-hosted Vertex AI
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.50, label: "Flash-Lite" },
  "gemini-3.1-flash": { input: 0.50, output: 3.00, label: "Flash" },
  "gemini-3.1-pro": { input: 2.00, output: 12.00, label: "Pro (Thinking)" },
  "text-embedding-005": { perKChars: 0.00006, label: "Embedding" },
  "nano-banana-pro": { perImage: 0.08, label: "Nano Banana Pro" },
  "nano-banana-2": { perImage: 0.04, label: "Nano Banana 2" },
  "veo-3.1": { perSecond: 0.15, label: "Veo 3.1" },
  "lyria-3-pro": { perSecond: 0.05, label: "Lyria 3 Pro" },
};

// Task → model mapping: always use the most optimized tier
const TASK_ROUTES = {
  // Edge layer tasks (Offline / Instant)
  spell_check: "gemini-nano",
  input_filtering: "gemini-nano",

  // Flash-Lite tasks (Intent routing, simple pattern matching)
  intent_classification: "gemini-3.1-flash-lite",
  entity_extraction: "gemini-3.1-flash-lite",
  sentiment_analysis: "gemini-3.1-flash-lite",

  // Gemma 4 tasks (Heavy grunt work, zero token cost)
  transcript_parsing: "gemma-4",
  document_summarization: "gemma-4",
  background_agent_loop: "gemma-4",
  function_calling: "gemma-4",

  // Flash tasks (Fast UI responses, multimodal)
  rag_generation: "gemini-3.1-flash",
  question_answering: "gemini-3.1-flash",
  context_injection: "gemini-3.1-flash",

  // Pro tasks (Deep multi-factor reasoning, complex architecture)
  niche_analysis: "gemini-3.1-pro",
  strategy_planning: "gemini-3.1-pro",
  architecture_review: "gemini-3.1-pro",
  massive_refactor: "gemini-3.1-pro",

  // Media generation
  ui_mockup_generation: "nano-banana-pro",
  thumbnail_generation: "nano-banana-2",
  video_generation: "veo-3.1",
  music_generation: "lyria-3-pro",
  embedding_generation: "text-embedding-005",
};

/**
 * Get the model for a given task.
 *
 * @param {string} task - Task identifier
 * @returns {{ model: string, pricing: object, label: string }}
 */
export function getModelForTask(task) {
  const model = TASK_ROUTES[task] || "gemini-3.1-flash-lite";
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gemini-3.1-flash-lite"];
  return { model, pricing, label: pricing.label };
}

/**
 * Estimate cost for a task given token counts.
 */
export function estimateTaskCost(task, inputTokens = 0, outputTokens = 0) {
  const { model, pricing, label } = getModelForTask(task);

  let estimatedCost = 0;
  if (pricing.input !== undefined && pricing.output !== undefined) {
    estimatedCost =
      (inputTokens * pricing.input) / 1_000_000 +
      (outputTokens * pricing.output) / 1_000_000;
  } else if (pricing.perImage) {
    estimatedCost = pricing.perImage;
  } else if (pricing.perSecond) {
    estimatedCost = pricing.perSecond * (outputTokens || 1);
  } else if (pricing.perKChars) {
    estimatedCost = pricing.perKChars * (inputTokens / 1000);
  }

  return { model, estimatedCost, label };
}

/**
 * Get the thinking budget for adaptive thinking_level.
 * With Gemini 3.1 Pro, we can map this to 'Low', 'Medium', 'High' internally in the API call.
 */
export function getThinkingBudget(task, override = "auto") {
  if (override !== "auto") {
    const budgets = { low: 1024, medium: 4096, high: 65536, none: 0 };
    return budgets[override] || 4096;
  }

  const model = TASK_ROUTES[task] || "gemini-3.1-flash-lite";
  if (model === "gemini-3.1-flash-lite" || model === "gemini-nano") return 0;
  if (model === "gemini-3.1-pro") return 65536; // Max 65k output logic chains
  return 4096;
}

export function getTaskCatalog() {
  return Object.entries(TASK_ROUTES).map(([task, model]) => ({
    task,
    model,
    label: MODEL_PRICING[model]?.label || model,
  }));
}

export { MODEL_PRICING, TASK_ROUTES };
