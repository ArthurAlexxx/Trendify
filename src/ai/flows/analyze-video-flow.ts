
'use server';
/**
 * @fileOverview Um fluxo de IA para analisar conteúdo de vídeo.
 *
 * - analyzeVideo - Uma função que lida com o processo de análise de vídeo.
 */
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/lib/types';
import { AnalyzeVideoOutputSchema } from '@/lib/types';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Para alterar o modelo do Gemini para esta análise, modifique a string abaixo.
const GEMINI_MODEL = 'googleai/gemini-2.5-flash';

export async function analyzeVideo(input: { videoUrl: string, prompt: string }): Promise<AnalyzeVideoOutput> {
    
    // A inicialização do Genkit é feita aqui dentro para cumprir as regras do 'use server'.
    const ai = genkit({
      plugins: [googleAI({
        apiKey: process.env.GEMINI_API_KEY
      })],
    });

    const { output } = await ai.generate({
        model: GEMINI_MODEL,
        prompt: [
            { text: `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts).
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática.

Instrução do Usuário: ${input.prompt}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.` 
            },
            { media: { url: input.videoUrl } }
        ],
        output: {
            schema: AnalyzeVideoOutputSchema,
        },
        config: {
            temperature: 0.5,
        }
    });

    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
