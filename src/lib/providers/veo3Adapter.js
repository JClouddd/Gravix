/**
 * @fileoverview veo3Adapter.js — Adapter for Veo 3 Provider
 */
export async function dispatchToVeo3(payload) {
  console.log("Dispatching to Veo 3:", payload);
  return { success: true, provider: "Veo 3", payload };
}
