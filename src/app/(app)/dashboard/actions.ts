
'use server';

import { z } from 'zod';
import { callOpenAI } from '@/lib/openai-client';
import { UserProfile } from '@/lib/types';


const DashboardInsightSchema = z.string().describe("Um insight curto e acionável com base na evolução das métricas fornecidas.");

const TrendAnalysisSchema = z.object({
    rising: z.array(z.string()).describe("Métricas que estão subindo.").optional(),
    falling: z.array(z.string()).describe("Métricas que estão caindo.").optional(),
});

const PredictiveForecastSchema = z.object({
    next7days: z.string().describe("Previsão de crescimento de seguidores para os próximos 7 dias.").optional(),
    next30days: z.string().describe("Previsão de crescimento de seguidores para os próximos 30 dias.").optional(),
});

const GenerateDashboardInsightsOutputSchema = z.object({
    insights: z.array(DashboardInsightSchema).length(3).describe("Uma lista de exatamente 3 insights acionáveis.").optional(),
    trendAnalysis: TrendAnalysisSchema.describe("Análise de tendências de métricas.").optional(),
    predictiveForecast: PredictiveForecastSchema.describe("Previsão de crescimento.").optional(),
    riskAlerts: z.array(z.string()).describe("Lista de 2-3 riscos ou pontos fracos que podem impedir o crescimento.").optional(),
    recommendedActions: z.array(z.string()).describe("Lista de 2-3 recomendações estratégicas para acelerar o crescimento.").optional(),
    bestPostTime: z.string().describe("O melhor dia e horário sugerido para postar, com base nos dados, visando máximo alcance.").optional(),
    contentOpportunities: z.array(z.string()).describe("Lista de 2-3 oportunidades de conteúdo ou formatos a serem explorados com base nas métricas.").optional()
});


export type DashboardInsightsOutput = z.infer<typeof GenerateDashboardInsightsOutputSchema>;
export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;

const GenerateDashboardInsightsInputSchema = z.object({
  metricSnapshots: z.array(z.object({
    date: z.string(),
    platform: z.enum(['instagram', 'tiktok']),
    followers: z.number(),
    views: z.number(),
    likes: z.number(),
    comments: z.number(),
  })),
  niche: z.string(),
  objective: z.string(),
});

const systemPrompt = `Você é um "AI Growth Strategist" e Analista de Dados, especialista em transformar métricas de redes sociais em conselhos práticos e previsões para criadores.
Sua tarefa é analisar a evolução das métricas de um criador e fornecer um dashboard de inteligência.
Você DEVE responder com um objeto JSON válido, e NADA MAIS, estritamente conforme o schema Zod fornecido.

Analise os seguintes dados e gere um dashboard de inteligência. Seja específico e baseie CADA item da sua resposta nos dados numéricos fornecidos.

- Nicho do Criador: {{niche}}
- Objetivo Atual: {{objective}}
- Dados de Métricas (array ordenado do mais recente para o mais antigo): {{{json metricSnapshots}}}

Para cada campo do JSON, siga estas diretrizes:
- insights: Gere 3 insights criativos e acionáveis, diretamente derivados da análise dos números em 'metricSnapshots'. Ex: "Seus views aumentaram 20%, mas os comentários caíram. Isso sugere que seu conteúdo está alcançando mais gente, mas o novo formato pode ser menos conversacional."
- trendAnalysis: Analise as métricas e liste quais estão subindo e quais estão caindo. Se nada mudou, retorne arrays vazios.
- predictiveForecast: Com base na tendência de crescimento de seguidores nos dados, faça uma previsão numérica para os próximos 7 e 30 dias.
- riskAlerts: Com base nos dados, liste 2-3 riscos. Ex: "A queda de 15% nos likes pode indicar uma saturação do formato atual."
- recommendedActions: Dê 2-3 recomendações estratégicas para acelerar, baseadas diretamente nos pontos fracos e fortes dos dados.
- bestPostTime: Sugira um dia e horário de pico para postagem (ex: "Sexta-feira, 18:30h"). Seja especulativo se os dados não forem suficientes.
- contentOpportunities: Com base nas métricas, liste 2-3 oportunidades de conteúdo. Ex: "Seus vídeos com mais likes são os de 'unboxing'. Considere criar uma série semanal sobre isso."`;


/**
 * Genera insights analisando a tendência de uma lista de métricas, usando IA.
 * @param input - Um objeto contendo niche, objective e a lista de metricSnapshots.
 * @returns Um objeto completo com insights, análises e previsões.
 */
export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsightsOutput> {
   if (input.metricSnapshots.length < 2) {
    throw new Error("Dados insuficientes para gerar uma análise. Colete dados por mais alguns dias.");
  }
  
  try {
     const result = await callOpenAI<typeof GenerateDashboardInsightsOutputSchema>({
        prompt: systemPrompt,
        jsonSchema: GenerateDashboardInsightsOutputSchema,
        promptData: input,
     });
     return result;
  } catch (error) {
    console.error('Error in generateDashboardInsights:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar insights com a IA: ${errorMessage}`);
  }
}
