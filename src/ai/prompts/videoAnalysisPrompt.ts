
import { ai } from '@/ai/genkit';
import { AnalyzeVideoInputSchema, AnalyzeVideoOutputSchema } from '@/ai/schemas';

export const videoAnalysisPrompt = ai.definePrompt({
  name: 'videoAnalysisPrompt',
  input: { schema: AnalyzeVideoInputSchema },
  output: { schema: AnalyzeVideoOutputSchema },
  prompt: `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts).
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática.

Instrução do Usuário: {{{prompt}}}

Vídeo para análise: {{media url=videoDataUri}}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.`,
});
