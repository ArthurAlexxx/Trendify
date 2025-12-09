
import { z } from 'zod';

// Input schema for the video analysis flow
export const AnalyzeVideoInputSchema = z.object({
  videoDataUri: z.string().describe("The video to be analyzed, encoded as a Base64 Data URI."),
  prompt: z.string().describe("The user's instruction for the analysis."),
});
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;


// Structured output schema for the video analysis
export const AnalyzeVideoOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).length(3).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
  estimatedHeatmap: z.string().describe("Uma análise textual de onde a retenção do público provavelmente cai, com base no ritmo e estrutura do vídeo. Ex: 'A retenção provavelmente cai entre 8s-12s devido à explicação muito longa.'"),
  comparativeAnalysis: z.string().describe("Uma breve comparação do vídeo analisado com padrões de sucesso do nicho. Ex: 'Comparado a outros vídeos de receita, o seu tem uma ótima fotografia, mas o ritmo é 20% mais lento.'"),
});
export type AnalyzeVideoOutput = z.infer<typeof AnalyzeVideoOutputSchema>;
