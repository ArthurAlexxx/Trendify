
'use server';
/**
 * @fileOverview Um fluxo de IA para analisar conteúdo de vídeo.
 *
 * - analyzeVideo - Uma função que lida com o processo de análise de vídeo.
 */
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/lib/types';
import { videoAnalysisPrompt } from '@/lib/google-ai-client';


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    const { output } = await videoAnalysisPrompt(input);

    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
