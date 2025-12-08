
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
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

const prompt = ai.definePrompt({
    name: 'dashboardInsightsPrompt',
    model: 'openai/gpt-4o',
    input: { schema: GenerateDashboardInsightsInputSchema },
    output: { schema: GenerateDashboardInsightsOutputSchema },
    prompt: `Você é um "AI Growth Strategist" e Analista de Dados, especialista em transformar métricas de redes sociais em conselhos práticos e previsões para criadores.
    Sua tarefa é analisar a evolução das métricas de um criador e fornecer um dashboard de inteligência.
    Você DEVE responder com um objeto JSON válido, e NADA MAIS, estritamente conforme o schema.

    Analise os seguintes dados e gere um dashboard de inteligência:

    - Nicho do Criador: {{{niche}}}
    - Objetivo Atual: {{{objective}}}
    - Dados de Métricas (array ordenado do mais recente para o mais antigo): {{{json metricSnapshots}}}

    Para cada campo do JSON, siga estas diretrizes:
    - insights: Gere 3 insights criativos e acionáveis, variados, sobre engajamento, alcance, etc. Cada insight deve ser uma string simples.
    - trendAnalysis: Analise as métricas e liste quais estão subindo e quais estão caindo. Se nada mudou, retorne arrays vazios.
    - predictiveForecast: Com base na tendência atual, faça uma previsão de crescimento de seguidores para os próximos 7 e 30 dias.
    - riskAlerts: Liste 2-3 riscos ou pontos fracos que podem impedir o crescimento. Ex: "Baixa frequência de posts pode diminuir o alcance".
    - recommendedActions: Dê 2-3 recomendações estratégicas para acelerar. Ex: "Focar em collabs com criadores maiores".
    - bestPostTime: Sugira um dia e horário de pico para postagem (ex: "Sexta-feira, 18:30h").
    - contentOpportunities: Liste 2-3 oportunidades de conteúdo ou formatos a serem explorados com base nas métricas.
    `
})

const generateInsightsFlow = ai.defineFlow({
    name: 'generateInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema,
    outputSchema: GenerateDashboardInsightsOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error('A IA não retornou uma análise.');
    }
    return output;
});


/**
 * Genera insights analisando a tendência de uma lista de métricas, usando IA.
 * @param input - Um objeto contendo niche, objective e a lista de metricSnapshots.
 * @returns Um objeto completo com insights, análises e previsões.
 */
export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsightsOutput> {
  const { metricSnapshots } = input;

  if (metricSnapshots.length < 2) {
    throw new Error("Dados insuficientes para gerar uma análise. Colete dados por mais alguns dias.");
  }
  
  try {
     const result = await generateInsightsFlow(input);
     return result;
  } catch (error) {
    console.error('Error in generateDashboardInsights:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar insights com a IA: ${errorMessage}`);
  }
}
