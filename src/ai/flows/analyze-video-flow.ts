
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { videoAnalysisPrompt } from '@/ai/prompts/videoAnalysisPrompt';
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/ai/schemas';

// Initialize Genkit directly in the file that uses it.
const ai = genkit({
  plugins: [
    googleAI({
      // Specify the API version if needed, e.g., 'v1beta'
      // apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: videoAnalysisPrompt,
        input: input,
        config: {
            temperature: 0.5,
        }
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
