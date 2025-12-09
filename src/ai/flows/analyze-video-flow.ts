
'use server';

import { ai } from '@/ai/genkit';
import { AnalyzeVideoInputSchema, AnalyzeVideoOutputSchema, type AnalyzeVideoInput, type AnalyzeVideoOutput } from '@/ai/schemas';

// Create an exported wrapper function to be called from Server Actions
export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
  // Define the multimodal prompt for the Gemini model
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

  // Define the main flow that orchestrates the process
  const analyzeVideoFlow = ai.defineFlow(
    {
      name: 'analyzeVideoFlow',
      inputSchema: AnalyzeVideoInputSchema,
      outputSchema: AnalyzeVideoOutputSchema,
    },
    async (input) => {
      
      // Use a specific model that supports video input
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
  );

  const result = await analyzeVideoFlow(input);
  return result;
}
