
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
const GEMINI_MODEL = 'googleai/gemini-1.5-pro-latest';

export async function analyzeVideo(input: { videoDataUri: string, prompt: string }): Promise<AnalyzeVideoOutput> {
    
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
CONTEXTO DINÂMICO 2025: Considere que algoritmos e tendências variam por nicho. Aplique as regras gerais das plataformas (Meta, TikTok, YouTube) conforme atualizadas em Q4/2025, mas adapte ao dinamismo específico do nicho fornecido.
DIRETRIZES DE SEGURANÇA: Independente do nicho, todas as sugestões devem respeitar as Políticas de Conteúdo das plataformas vigentes em 2025 e a legislação brasileira (LGPD, Marco Civil da Internet). Adapte o tom e abordagem conforme a sensibilidade do nicho.

ANÁLISE DINÂMICA POR NICHO:
1. Para nichos visuais (moda, beleza, arte): Avalie qualidade de imagem, cores, enquadramento.
2. Para nichos informativos (educação, finanças, notícias): Avalie clareza da informação, fontes, didática.
3. Para nichos emocionais (storytelling, vlogs): Avalie conexão emocional, autenticidade.
4. Para nichos de produto (reviews, tutoriais): Avalie demonstração clara, calls-to-action, prova social.

CRITÉRIOS COMUNS: retenção inicial (0-3s), clareza da mensagem, adequação ao público-alvo do nicho.

Instrução do Usuário: ${input.prompt}

Analise o vídeo e retorne um objeto JSON com a sua avaliação, seguindo estritamente o schema de output definido.` 
            },
            { media: { url: input.videoDataUri } }
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
