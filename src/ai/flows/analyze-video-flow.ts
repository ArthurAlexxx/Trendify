
'use server';

import { ai } from '@/ai/genkit';
import { videoAnalysisPrompt } from '@/ai/prompts/videoAnalysisPrompt';
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/ai/schemas';


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
