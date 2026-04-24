/**
 * @fileoverview lyriaAdapter.js — Adapter for Lyria Provider
 */
export async function dispatchToLyria(payload) {
  console.log("Dispatching to Lyria:", payload);
  return { success: true, provider: "Lyria", payload };
}
