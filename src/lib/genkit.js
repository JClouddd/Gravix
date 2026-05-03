import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize the Genkit instance
export const ai = genkit({
  plugins: [googleAI()],
  // You can specify a default model here if desired, e.g.:
  // model: 'gemini-1.5-flash',
});

// Example flow initialization (can be moved or expanded later)
// export const myFlow = ai.defineFlow({ ... })
