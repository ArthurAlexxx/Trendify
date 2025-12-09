
'use server';
/**
 * @fileOverview Um fluxo de IA para analisar conteúdo de vídeo.
 *
 * - analyzeVideo - Uma função que lida com o processo de análise de vídeo.
 * - AnalyzeVideoInput - O tipo de entrada para a função analyzeVideo.
 * - AnalyzeVideoOutput - O tipo de retorno para a função analyzeVideo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "Um vídeo como um data URI que deve incluir um tipo MIME e usar a codificação Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('A instrução para orientar a análise do vídeo.'),
});
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;

const AnalyzeVideoOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).length(3).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
  estimatedHeatmap: z.string().describe("Uma análise textual de onde a retenção do público provavelmente cai, com base no ritmo e estrutura do vídeo. Ex: 'A retenção provavelmente cai entre 8s-12s devido à explicação muito longa.'"),
  comparativeAnalysis: z.string().describe("Uma breve comparação do vídeo analisado com padrões de sucesso do nicho. Ex: 'Comparado a outros vídeos de receita, o seu tem uma ótima fotografia, mas o ritmo é 20% mais lento.'"),
});
export type AnalyzeVideoOutput = z.infer<typeof AnalyzeVideoOutputSchema>;


const videoAnalysisPrompt = ai.definePrompt({
  name: 'videoAnalysisPrompt',
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


export async function analyzeVideo(input: AnalyzeVideoInput): Promise<AnalyzeVideoOutput> {
    const llmResponse = await videoAnalysisPrompt(input);

    const output = llmResponse;
    if (!output) {
      throw new Error("A análise da IA não produziu um resultado válido.");
    }
    return output;
}
