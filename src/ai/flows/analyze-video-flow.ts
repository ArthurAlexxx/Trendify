'use server';
/**
 * @fileOverview Um fluxo de IA para analisar conteúdo de vídeo.
 *
 * - analyzeVideo - Uma função que lida com o processo de análise de vídeo.
 */
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/lib/types';
import { AnalyzeVideoInputSchema, AnalyzeVideoOutputSchema } from '@/lib/types';
import { ai } from '@/ai/genkit';


const analysisPrompt = ai.definePrompt({
  name: 'videoAnalysisPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: AnalyzeVideoInputSchema },
  output: { schema: AnalyzeVideoOutputSchema },
  config: {
    temperature: 0.5,
  },
  prompt: `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts).
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática.

Instrução do Usuário: {{{prompt}}}
Vídeo: {{media url=videoDataUri}}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.`,
});


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    
    const { output } = await analysisPrompt(input);

    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
