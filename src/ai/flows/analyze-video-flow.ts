
'use server';

import { ai } from '@/ai/genkit';
import { AnalyzeVideoInputSchema, AnalyzeVideoOutputSchema, type AnalyzeVideoInput, type AnalyzeVideoOutput } from '@/ai/schemas';

const analysisPrompt = ai.definePrompt({
  name: 'videoAnalysisPrompt',
  input: { schema: AnalyzeVideoInputSchema },
  output: { schema: AnalyzeVideoOutputSchema },
  prompt: `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts).
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática.

Instrução do Usuário: {{{prompt}}}

Vídeo para análise: {{media url=videoDataUri}}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.`,
});

export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: analysisPrompt,
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
