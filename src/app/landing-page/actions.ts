
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
  months: z.number().describe("O número total de meses estimados para atingir a meta."),
  goalDate: z.string().describe("A data estimada em que a meta será atingida, no formato ISO 8601."),
  currentEarnings: z.array(z.number()).length(2).describe("Uma faixa de ganhos mensais estimada com os seguidores atuais [min, max]."),
  goalEarnings: z.array(z.number()).length(2).describe("Uma faixa de ganhos mensais estimada ao atingir a meta de seguidores [min, max]."),
  growthData: z.array(GrowthDataPointSchema).describe("Um array de objetos, onde cada objeto tem 'month' e 'followers', para plotar a curva de crescimento."),
  trendSuggestions: z.array(TrendSuggestionSchema).describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
  postsPerMonth: z.number().describe("O número de publicações por mês usado no cálculo, para exibição."),
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
  const systemPrompt = `Você é um "AI Growth Advisor", um consultor especialista em crescimento de criadores de conteúdo. Sua tarefa é analisar os dados de um criador e gerar uma projeção realista e acionável.
  Lembre-se, a data atual é dezembro de 2025.
  Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Analise os seguintes dados e gere uma projeção de crescimento completa:

  - Nicho: ${input.niche}
  - Seguidores Atuais: ${input.followers}
  - Meta de Seguidores: ${input.goal}
  - Média de publicações por Mês: ${input.postsPerMonth}

  Para cada campo do JSON, siga estas diretrizes:

  - months: Calcule o número de meses para atingir a meta, com um máximo de 24 meses. Seja realista, considerando que o crescimento é exponencial. Uma taxa de crescimento mensal entre 5% e 15% é razoável, dependendo do nicho e da consistência (publicações/mês). Nichos como finanças e tecnologia crescem mais rápido.
  - goalDate: Calcule a data futura com base no número de meses e retorne em formato ISO 8601.
  - currentEarnings e goalEarnings: Estime uma FAIXA de ganhos [mínimo, máximo] com publicidade com MÁXIMA PRECISÃO. Use um CPM (Custo por Mil visualizações) médio para o Brasil que varia entre R$15 (entretenimento) e R$150 (finanças/tecnologia), ajustado para o nicho de '${input.niche}'. Detalhe sua lógica: estime que 20-50% dos seguidores veem uma publicação e que o criador pode fazer cerca de 4-8 publis por mês.
  - growthData: Crie um array de objetos. CADA objeto deve ter duas chaves: 'month' (o número do mês) e 'followers' (o número projetado de seguidores).
  - trendSuggestions: Forneça EXATAMENTE 3 ideias de ganchos para vídeos virais, relevantes para o nicho '${input.niche}'. Cada item no array DEVE ser um objeto com as chaves "hook" (string) e "icon" (string de emoji).
  - postsPerMonth: Apenas retorne o valor de entrada.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
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

  try {
    const result = await calculateGrowthAI(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao calcular crescimento: ${errorMessage}` };
  }
}
