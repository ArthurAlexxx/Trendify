
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const ItemRoteiroSchema = z.object({
  dia: z.string().describe('O dia da semana para a tarefa (ex: "Segunda").'),
  tarefa: z.string().describe('A descrição da tarefa a ser executada.'),
  detalhes: z
    .string()
    .describe('Detalhes adicionais ou um passo a passo para a tarefa.'),
  concluido: z.boolean().default(false),
});

const PontoDadosGraficoSchema = z.object({
  data: z.string().describe('O dia da semana, abreviado (ex: "Seg", "Ter", "Qua", etc.).'),
  alcance: z.number().describe('O alcance simulado para aquele dia.'),
  engajamento: z.number().describe('O engajamento simulado para aquele dia.'),
});

const GenerateWeeklyPlanOutputSchema = z.object({
  weeklyPlan: z
    .array(ItemRoteiroSchema)
    .describe(
      'Um array de 7 itens, um para cada dia da semana, com tarefas de conteúdo.'
    ).transform(items => items.map(item => ({ ...item, concluido: false }))),
  simulatedPerformance: z
    .array(PontoDadosGraficoSchema)
    .describe(
      'Um array de 7 pontos de dados para o gráfico de desempenho, simulando o potencial do roteiro.'
    ),
  effortLevel: z.enum(['Baixo', 'Médio', 'Alto']).describe("A carga de trabalho estimada para executar o plano da semana."),
  priorityIndex: z.array(z.string()).length(3).describe("As 3 tarefas da semana com maior impacto potencial no crescimento."),
  realignmentTips: z.string().describe("Dicas sobre o que fazer caso o usuário perca 1 ou 2 dias do plano, para realinhar a estratégia sem perder a semana."),
});


export type GenerateWeeklyPlanOutput = z.infer<
  typeof GenerateWeeklyPlanOutputSchema
>;

const formSchema = z.object({
  objective: z.string().min(1, 'O objetivo da semana é obrigatório.'),
  niche: z.string().min(3, 'Seu nicho é necessário.'),
  currentStats: z.string().min(3, 'Suas estatísticas são necessárias.'),
  totalFollowerGoal: z.number().optional(),
  instagramFollowerGoal: z.number().optional(),
  tiktokFollowerGoal: z.number().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

type WeeklyPlanState = {
  data?: GenerateWeeklyPlanOutput;
  error?: string;
} | null;

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

async function generateWeeklyPlan(
  input: FormSchemaType
): Promise<GenerateWeeklyPlanOutput> {
  const systemPrompt = `Você é uma IA especialista em crescimento de influenciadores, estratégias de conteúdo, análise de dados, criação de roteiros e otimização de campanhas com marcas. Sua função é atuar como um Estrategista Chefe.
  Sempre entregue respostas profundas, claras, práticas e extremamente profissionais.
  Ao responder, utilize a mentalidade de: consultor de marketing, estrategista digital, analista de dados.
  Lembre-se, a data atual é dezembro de 2025.
  Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;
  
  let goalContext = 'Nenhuma meta de seguidores específica foi definida.';
  if (input.totalFollowerGoal) {
    goalContext = `A meta principal é atingir ${input.totalFollowerGoal} seguidores no total (Instagram + TikTok).`;
  } else if (input.instagramFollowerGoal) {
    goalContext = `A meta principal é atingir ${input.instagramFollowerGoal} seguidores no Instagram. Priorize estratégias para essa plataforma.`;
  } else if (input.tiktokFollowerGoal) {
     goalContext = `A meta principal é atingir ${input.tiktokFollowerGoal} seguidores no TikTok. Priorize estratégias para essa plataforma.`;
  }


  const userPrompt = `
  Analise os seguintes dados e gere um plano de conteúdo semanal completo, atuando como um Estrategista Chefe.

  - Objetivo da Semana: "${input.objective}"
  - Nicho do Criador: ${input.niche}
  - Estatísticas Atuais: ${input.currentStats}
  - Meta de Seguidores: ${goalContext}

  Siga as diretrizes para cada campo JSON:
  - weeklyPlan: Crie um array com exatamente 7 objetos (Segunda a Domingo). Cada objeto deve ter 'dia', 'tarefa' (específica, acionável e criativa), 'detalhes' (um passo a passo claro) e 'concluido' (sempre false). As tarefas devem ser uma mistura de produção de conteúdo, interação e análise.
  - simulatedPerformance: Crie um array de 7 objetos (Seg a Dom) para um gráfico, com 'data', 'alcance' (int) e 'engajamento' (int). A simulação deve ser realista, variando conforme as tarefas do dia (dias de post têm picos).
  - effortLevel: Classifique o esforço da semana como 'Baixo', 'Médio' ou 'Alto', com base na complexidade e volume das tarefas.
  - priorityIndex: Identifique e liste as 3 tarefas da semana com o maior potencial de impacto para atingir o objetivo principal.
  - realignmentTips: Ofereça um conselho estratégico sobre como o usuário pode se realinhar caso perca 1 ou 2 dias do plano. Ex: "Se perder um dia de post, combine o tema com o do dia seguinte ou foque em dobrar a interação no fim de semana para compensar."
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');

    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');

    const parsedJson = JSON.parse(jsonString);
    return GenerateWeeklyPlanOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error in generateWeeklyPlan:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar plano com a IA: ${errorMessage}`);
  }
}

export async function generateWeeklyPlanAction(
  prevState: WeeklyPlanState,
  formData: FormSchemaType
): Promise<WeeklyPlanState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    return { error: 'Por favor, preencha todos os campos obrigatórios.' };
  }

  try {
    const result = await generateWeeklyPlan(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar plano: ${errorMessage}` };
  }
}

    