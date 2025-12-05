
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const TrendSuggestionSchema = z.object({
  hook: z.string().describe("Um gancho ou título para a ideia de vídeo."),
  icon: z.string().emoji().describe("Um emoji que representa a ideia."),
});

const GrowthDataPointSchema = z.object({
  month: z.number().describe("O número do mês (ex: 0, 1, 2...)."),
  followers: z.number().describe("O número de seguidores projetado para aquele mês."),
});

const GrowthCalculatorOutputSchema = z.object({
  months: z.number().optional().describe("O número total de meses estimados para atingir a meta."),
  goalDate: z.string().optional().describe("A data estimada em que a meta será atingida, no formato ISO 8601."),
  currentEarnings: z.array(z.number()).optional().describe("Uma faixa de ganhos mensais estimada com os seguidores atuais [min, max]."),
  goalEarnings: z.array(z.number()).optional().describe("Uma faixa de ganhos mensais estimada ao atingir a meta de seguidores [min, max]."),
  growthData: z.array(GrowthDataPointSchema).optional().describe("Um array de objetos, onde cada objeto tem 'month' e 'followers', para plotar a curva de crescimento."),
  trendSuggestions: z.array(TrendSuggestionSchema).optional().describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
  postsPerMonth: z.number().optional().describe("O número de publicações por mês usado no cálculo, para exibição."),
  difficultyScore: z.enum(['Fácil', 'Realista', 'Difícil']).optional().describe("Classificação do quão realista é atingir a meta com os dados fornecidos."),
  riskPanel: z.array(z.string()).optional().describe("Lista com 2-3 riscos e pontos fracos que podem atrasar a meta."),
  recommendations: z.array(z.string()).optional().describe("Lista de 2-3 recomendações acionáveis para alcançar a meta mais rápido."),
  benchmarkComparison: z.string().optional().describe("Uma breve análise de como o usuário se compara ao mercado do nicho em termos de crescimento."),
  accelerationScenarios: z.object({
      maintain: z.number(),
      plus20: z.number(),
      plus40: z.number(),
  }).optional().describe("Cenários de aceleração do crescimento baseados no volume de posts."),
});


export type GrowthCalculatorOutput = z.infer<typeof GrowthCalculatorOutputSchema>;

const formSchema = z.object({
  niche: z.string().min(3, 'O nicho deve ter pelo menos 3 caracteres.'),
  followers: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'O número de seguidores é muito alto.'),
  goal: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'A meta de seguidores é muito alta.'),
  postsPerMonth: z.number().min(0),
});

type FormSchemaType = z.infer<typeof formSchema>;

type ActionState = {
  data?: GrowthCalculatorOutput;
  error?: string;
};

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

async function calculateGrowthAI(input: FormSchemaType): Promise<GrowthCalculatorOutput> {
   const systemPrompt = `
    Você é o GrowthAI Engine v3.0, um sistema avançado de análise e projeção para criadores de conteúdo.
    Sua identidade é a de um consultor profissional, matemático e estrategista digital.
    Sua tarefa é analisar os dados de um usuário e retornar uma projeção de crescimento completa.

    **REGRAS FUNDAMENTAIS:**
    1.  **Data de Referência:** A data atual é Dezembro de 2025.
    2.  **Cálculos Realistas:** Baseie todos os cálculos nos dados de entrada e em benchmarks de mercado.
    3.  **SAÍDA ESTRITA:** Sua única resposta DEVE ser um objeto JSON válido que se conforma ao schema.

    **Módulos de Comportamento:**
    - **Interpretação de Nicho:** Mapeie o nicho para uma categoria de crescimento (Rápido: 10-18%/mês para finanças, tecnologia; Médio: 6-12%/mês para games, beleza, fitness; Lento: 3-7%/mês para humor, vlogs).
    - **Cálculo de Crescimento:** Calcule o número de meses até a meta com base na taxa do nicho.
    - **Projeção de Data:** Calcule a data final a partir de 2025-12-01.
    - **Projeção de Ganhos (Earnings):** Calcule uma faixa de ganhos [min, max] com base no CPM do nicho, alcance orgânico (20-50% dos seguidores) e 4-8 publis/mês.
    - **Dificuldade:** Classifique a meta como 'Fácil', 'Realista' ou 'Difícil'.
    - **Riscos e Recomendações:** Liste 2-3 riscos e 2-3 recomendações.
    - **Benchmark:** Compare a projeção com a média do nicho.
    - **Cenários de Aceleração:** Calcule os meses para atingir a meta mantendo, aumentando em 20% e 40% os posts.
    - **Sugestões de Tendências:** Gere 3 ideias de ganchos virais, cada um sendo um objeto com "hook" e "icon".
  `;

  const userPrompt = `
    Analise os dados do usuário abaixo e gere a projeção de crescimento completa em formato JSON. Siga todas as regras e módulos definidos.

    - **Nicho:** ${input.niche}
    - **Seguidores Atuais:** ${input.followers}
    - **Meta de Seguidores:** ${input.goal}
    - **Média de Publicações por Mês:** ${input.postsPerMonth}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');

    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');

    const parsedJson = JSON.parse(jsonString);
    return GrowthCalculatorOutputSchema.parse(parsedJson);

  } catch (error) {
    console.error('Error in calculateGrowthAI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar projeção com a IA: ${errorMessage}`);
  }
}

export async function calculateGrowthAction(
  prevState: ActionState | null,
  data: FormSchemaType
): Promise<ActionState> {
  const parsed = formSchema.safeParse(data);

  if (!parsed.success) {
    return { error: 'Por favor, preencha todos os campos corretamente.' };
  }
  
  if (parsed.data.goal <= parsed.data.followers) {
    return { error: 'A meta de seguidores deve ser maior que o número atual de seguidores.' };
  }


  try {
    const result = await calculateGrowthAI(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao calcular crescimento: ${errorMessage}` };
  }
}
