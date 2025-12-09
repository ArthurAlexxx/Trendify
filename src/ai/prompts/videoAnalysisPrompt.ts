
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { AnalyzeVideoInputSchema, AnalyzeVideoOutputSchema } from '@/ai/schemas';

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

export const videoAnalysisPrompt = ai.definePrompt({
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

Vídeo para análise: {{media url=videoDataUri}}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.`,
});
