
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
  data: z.string().describe('O dia da semana, abreviado (ex: "Seg").'),
  alcance: z.number().describe('O alcance simulado para aquele dia.'),
  engajamento: z.number().describe('O engajamento simulado para aquele dia.'),
});

const GenerateWeeklyPlanOutputSchema = z.object({
  roteiro: z
    .array(ItemRoteiroSchema)
    .describe(
      'Um array de 7 itens, um para cada dia da semana, com tarefas de conteúdo.'
    ),
  desempenhoSimulado: z
    .array(PontoDadosGraficoSchema)
    .describe(
      'Um array de 7 pontos de dados para o gráfico de desempenho, simulando o potencial do roteiro.'
    ),
});

export type GenerateWeeklyPlanOutput = z.infer<
  typeof GenerateWeeklyPlanOutputSchema
>;

const formSchema = z.object({
  objective: z.string().min(1, 'O objetivo da semana é obrigatório.'),
  niche: z.string().min(3, 'Seu nicho é necessário.'),
  currentStats: z.string().min(3, 'Suas estatísticas são necessárias.'),
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
  const systemPrompt = `Você é um "AI Growth Strategist" para criadores de conteúdo. Sua tarefa é criar um plano de conteúdo semanal completo e acionável, além de uma simulação de desempenho correspondente.
  Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Crie um plano de conteúdo para 7 dias e uma simulação de desempenho com base nos seguintes dados:

  - Nicho do Criador: ${input.niche}
  - Estatísticas Atuais (seguidores, engajamento): ${input.currentStats}
  - Objetivo Principal para a Semana: "${input.objective}"

  Para cada campo do JSON, siga estas diretrizes:

  - roteiro: Crie um array com EXATAMENTE 7 objetos, um para cada dia da semana (Segunda a Domingo). Cada objeto deve conter:
    - dia: O nome do dia da semana (ex: "Segunda").
    - tarefa: Uma tarefa de conteúdo específica e acionável (ex: "Gravar Reels sobre [tópico]").
    - detalhes: Uma breve explicação do que fazer na tarefa (ex: "Use o áudio X em alta e foque em um gancho de 3 segundos.").
    - concluido: Deve ser 'false' por padrão.

  - desempenhoSimulado: Crie um array com EXATAMENTE 7 objetos, um para cada dia da semana (Seg a Dom), para popular um gráfico. Cada objeto deve conter:
    - data: O dia da semana abreviado (ex: "Seg", "Ter", "Qua", etc.).
    - alcance: Um número INTEIRO simulando o alcance potencial para aquele dia, baseado na tarefa do roteiro.
    - engajamento: Um número INTEIRO simulando o engajamento potencial para aquele dia.
    - A simulação deve ser realista e variar de acordo com as tarefas. Por exemplo, dias de postagem de Reels devem ter maior alcance simulado.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
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
    // Retorna os dados gerados pela IA, a escrita no banco será feita no cliente
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar plano: ${errorMessage}` };
  }
}
