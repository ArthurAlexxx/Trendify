
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const MetricSnapshotSchema = z.object({
  date: z.string().datetime(),
  platform: z.enum(['instagram', 'tiktok']),
  followers: z.number(),
  views: z.number(),
  likes: z.number(),
  comments: z.number(),
});

const DashboardInsightSchema = z.object({
    insight: z.string().describe("Um insight curto e acionável com base nas métricas fornecidas.")
});

export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;

const GenerateDashboardInsightsInputSchema = z.object({
  niche: z.string(),
  objective: z.string(),
  metricSnapshots: z.array(MetricSnapshotSchema),
});

const GenerateDashboardInsightsOutputSchema = z.object({
  insights: z
    .array(DashboardInsightSchema)
    .describe('Uma lista de 2 a 3 insights acionáveis sobre o desempenho do criador.'),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


async function generateDashboardInsightsWithOpenAI(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsight[]> {

  const systemPrompt = `Você é um estrategista de crescimento para criadores de conteúdo. Analise as métricas dos últimos dias, o nicho e o objetivo do criador para gerar 2 ou 3 insights rápidos e acionáveis para ajudar o criador a atingir seu objetivo. Seja direto e prático. Foco em ações de curto prazo. Você DEVE retornar um JSON válido que siga o schema.`;

  const userPrompt = `
  - Nicho: ${input.niche}
  - Objetivo: ${input.objective}
  - Métricas Recentes:
  ${input.metricSnapshots.map(s => `  - Dia: ${s.date}, Plataforma: ${s.platform}, Seguidores: ${s.followers}, Views: ${s.views}, Likes: ${s.likes}, Comentários: ${s.comments}`).join('\n')}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
        throw new Error("A IA não conseguiu gerar insights.");
    }
    const parsed = GenerateDashboardInsightsOutputSchema.parse(JSON.parse(content));
    return parsed.insights;
  } catch (error) {
    console.error("Error generating insights with OpenAI:", error);
    throw new Error("Falha ao comunicar com a IA para gerar insights.");
  }
}


export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsight[]> {
  return generateDashboardInsightsWithOpenAI(input);
}
