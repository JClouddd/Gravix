import { structuredGenerate } from "@/lib/geminiClient";

/**
 * Generates a master script for a YouTube video based on a topic and target audience.
 * @param {string} topic The topic of the video.
 * @param {string} audience The target audience for the video.
 * @returns {Promise<Object>} An object containing the structured master script.
 */
export async function generateMasterScript(topic, audience) {
  if (!topic) {
    throw new Error("topic is required");
  }

  const prompt = `Create a detailed master script and incubation plan for a YouTube video about: "${topic}".
Target audience: ${audience || 'General audience'}.
The master script should include:
1. Video Title Ideas (3-5 catchy options)
2. Target Keyword Strategy
3. Outline/Structure (Intro, Hook, Main Body, Outro, CTA)
4. Key Talking Points
5. Estimated Video Length
Format the response as JSON.`;

  const schema = {
    type: "object",
    properties: {
      titles: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
      outline: {
        type: "object",
        properties: {
          hook: { type: "string" },
          intro: { type: "string" },
          body: { type: "array", items: { type: "string" } },
          outro: { type: "string" },
          cta: { type: "string" }
        }
      },
      talkingPoints: { type: "array", items: { type: "string" } },
      estimatedLength: { type: "string" }
    },
    required: ["titles", "keywords", "outline", "talkingPoints", "estimatedLength"]
  };

  const response = await structuredGenerate({
    prompt,
    systemPrompt: "You are an expert YouTube strategist and scriptwriter. You help creators brainstorm, structure, and write high-performing video scripts.",
    complexity: "pro",
    schema
  });

  try {
    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    throw new Error("Failed to parse master script from Gemini: " + response.text);
  }
}
