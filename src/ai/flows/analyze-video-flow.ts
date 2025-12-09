
'use server';

import { videoAnalysisPrompt } from '@/ai/prompts/videoAnalysisPrompt';
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/ai/schemas';


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    const llmResponse = await videoAnalysisPrompt(input);

    const output = llmResponse.output();
    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
