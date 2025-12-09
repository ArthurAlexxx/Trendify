'use server';
/**
 * @fileOverview Um fluxo de IA para analisar conteúdo de vídeo.
 *
 * - analyzeVideo - Uma função que lida com o processo de análise de vídeo.
 */
import type { AnalyzeVideoInput, AnalyzeVideoOutput } from '@/lib/types';
import { AnalyzeVideoOutputSchema } from '@/lib/types';
import { callOpenAI } from '@/lib/openai-client';


const analysisPrompt = `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts).
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática.

Instrução do Usuário: {{{prompt}}}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.`;


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    
    // O vídeo é grande, então vamos usar a OpenAI que suporta URLs diretas.
    // O `videoDataUri` será tratado como uma URL pelo `callOpenAI`
    const result = await callOpenAI({
        prompt: analysisPrompt,
        jsonSchema: AnalyzeVideoOutputSchema,
        promptData: { prompt: input.prompt },
        videoUrl: input.videoDataUri
    });

    if (!result) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return result;
}
