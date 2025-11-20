
'use server';
/**
 * @fileOverview Um agente de IA para análise de vídeos.
 *
 * Esta funcionalidade está temporariamente desativada.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VideoReviewInputSchema = z.object({
  videoDataUri: z.string().min(1, 'O upload do vídeo é obrigatório.'),
});
export type VideoReviewInput = z.infer<typeof VideoReviewInputSchema>;

const VideoReviewOutputSchema = z.object({
  score: z.number().describe('Uma pontuação geral para o vídeo (0-100), refletindo seu potencial de viralização.'),
  hookSuggestions: z.array(z.string()).describe('Sugestões acionáveis para melhorar o gancho do vídeo nos primeiros 2 segundos.'),
  pacingSuggestions: z.string().describe('Sugestões sobre o ritmo, cortes e energia do vídeo para maximizar a retenção.'),
  caption: z.string().describe('Uma legenda otimizada para a plataforma, com hashtags estratégicas e um CTA claro.'),
  scriptVariations: z.array(z.string()).describe('Variações otimizadas do roteiro para melhorar a clareza e o impacto da mensagem.'),
});
export type VideoReviewOutput = z.infer<typeof VideoReviewOutputSchema>;


export const videoReviewFlow = ai.defineFlow(
  {
    name: 'videoReviewFlow',
    inputSchema: VideoReviewInputSchema,
    outputSchema: VideoReviewOutputSchema,
  },
  async (input) => {
    // This flow is temporarily disabled.
    throw new Error('Video review feature is currently under maintenance.');
  }
);
