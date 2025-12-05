
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const DashboardInsightSchema = z.string().describe("Um insight curto e acionável com base na evolução das métricas fornecidas.");

const TrendAnalysisSchema = z.object({
    rising: z.array(z.string()).describe("Métricas que estão subindo."),
    falling: z.array(z.string()).describe("Métricas que estão caindo."),
});

const PredictiveForecastSchema = z.object({
    next7days: z.string().describe("Previsão de crescimento de seguidores para os próximos 7 dias."),
    next30days: z.string().describe("Previsão de crescimento de seguidores para os próximos 30 dias."),
});

const GenerateDashboardInsightsOutputSchema = z.object({
    insights: z.array(DashboardInsightSchema).length(3).describe("Uma lista de exatamente 3 insights acionáveis."),
    trendAnalysis: TrendAnalysisSchema.describe("Análise de tendências de métricas."),
    predictiveForecast: PredictiveForecastSchema.describe("Previsão de crescimento."),
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text: string) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  return null;
}

/**
 * Genera insights analisando a tendência de uma lista de métricas, usando IA.
 * @param input - Um objeto contendo niche, objective e a lista de metricSnapshots.
 * @returns Um objeto completo com insights, análises e previsões.
 */
export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsightsOutput> {
  const { metricSnapshots, niche, objective } = input;

  if (metricSnapshots.length < 2) {
    throw new Error("Dados insuficientes para gerar uma análise. Colete dados por mais alguns dias.");
  }
  
  const systemPrompt = `Você é um "AI Growth Strategist" e Analista de Dados, especialista em transformar métricas de redes sociais em conselhos práticos e previsões para criadores.
  Sua tarefa é analisar a evolução das métricas de um criador e fornecer um dashboard de inteligência.
  Você DEVE responder com um objeto JSON válido, e NADA MAIS, estritamente conforme o schema.`;

  const userPrompt = `
  Analise os seguintes dados e gere um dashboard de inteligência:

  - Nicho do Criador: ${niche}
  - Objetivo Atual: ${objective}
  - Dados de Métricas (array ordenado do mais recente para o mais antigo): ${JSON.stringify(metricSnapshots, null, 2)}

  Para cada campo do JSON, siga estas diretrizes:
  - insights: Gere 3 insights criativos e acionáveis, variados, sobre engajamento, alcance, etc. Cada insight deve ser uma string simples.
  - trendAnalysis: Analise as métricas e liste quais estão subindo e quais estão caindo. Se nada mudou, retorne arrays vazios.
  - predictiveForecast: Com base na tendência atual, faça uma previsão de crescimento de seguidores para os próximos 7 e 30 dias.
  `;
  
   try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');
    
    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');

    const parsedJson = JSON.parse(jsonString);
    const validatedData = GenerateDashboardInsightsOutputSchema.parse(parsedJson);

    return validatedData;
  } catch (error) {
    console.error('Error in generateDashboardInsights:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar insights com a IA: ${errorMessage}`);
  }
}
