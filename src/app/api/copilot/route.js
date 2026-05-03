import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ai } from '@/lib/genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import { queryVault } from '@/lib/ragService';

// Define the Knowledge Bridge Tool
const queryVaultTool = ai.defineTool({
  name: 'queryVault',
  description: 'Search the Gravix BigQuery Knowledge Vault for information about YouTube masterclasses, channel blueprints, niches, or enterprise documents. Use this whenever the user asks about internal data or videos.',
  inputSchema: z.object({
    query: z.string().describe('The search query to run against the knowledge vault.'),
  }),
  outputSchema: z.string(),
}, async ({ query }) => {
  const context = await queryVault(query);
  return context || "No relevant information found in the vault.";
});

// Define the Jules Trigger Tool
const triggerJulesTool = ai.defineTool({
  name: 'triggerJules',
  description: 'Trigger the Jules Autonomous Engineer to build a new feature, UI component, or fix a bug. Use this whenever the user asks to "build", "create", "fix", or "add" a complex feature to the application.',
  inputSchema: z.object({
    prompt: z.string().describe('Highly detailed instructions for what Jules needs to build or fix.'),
    title: z.string().describe('A short, conventional commit style title for the PR (e.g., "feat: Add CPM Dashboard").'),
    files: z.array(z.string()).describe('List of file paths Jules should focus on or modify.'),
    acceptanceCriteria: z.string().describe('Clear criteria for what "done" looks like so Jules can self-validate.'),
  }),
  outputSchema: z.string(),
}, async ({ prompt, title, files, acceptanceCriteria }) => {
  try {
    const response = await fetch("https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/jules/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        title,
        files,
        fileLocks: files, // Lock the files we are modifying
        autoApprove: true,
        acceptanceCriteria
      })
    });

    if (!response.ok) {
      throw new Error(`Jules API failed with status ${response.status}`);
    }
    
    return `Successfully triggered Jules to build "${title}". A PR will be created and Firebase App Hosting will generate a Preview URL shortly.`;
  } catch (error) {
    return `Failed to trigger Jules: ${error.message}`;
  }
});

// Define the Copilot flow
const copilotFlow = ai.defineFlow({
  name: 'copilotFlow',
  inputSchema: z.object({
    prompt: z.string(),
    context: z.string().optional(),
  }),
  outputSchema: z.string(),
}, async (input) => {
  const { prompt, context } = input;
  
  // Construct the full prompt
  const fullPrompt = context 
    ? `System Context: ${context}\n\nUser Request: ${prompt}`
    : `User Request: ${prompt}`;

  // Call the model with tool access
  const { text } = await ai.generate({
    model: gemini15Flash,
    prompt: fullPrompt,
    tools: [queryVaultTool, triggerJulesTool],
    config: {
      temperature: 0.2, // Low temperature for factual, operational responses
    }
  });

  return text;
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Execute the Genkit flow
    const responseText = await copilotFlow({ prompt, context });

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Copilot Flow Error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
