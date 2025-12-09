
'use server';

import { analyzeVideo as analyzeVideoFlow, type AnalyzeVideoInput, type AnalyzeVideoOutput } from '@/ai/flows/analyze-video-flow';

type ActionState = {
  data?: AnalyzeVideoOutput;
  error?: string;
} | null;

/**
 * Server Action to analyze a video provided as a Data URL using Genkit.
 */
export async function analyzeVideo(
  input: AnalyzeVideoInput
): Promise<ActionState> {
  try {
    const analysis = await analyzeVideoFlow(input);
    return { data: analysis };
  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise de vídeo:", e);
    const errorMessage = e.message || 'Erro desconhecido.';
    return { error: `Ocorreu um erro durante a análise: ${errorMessage}` };
  }
}
