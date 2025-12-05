
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
  trendSuggestions: z.array(TrendSuggestionSchema).length(3).describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
  postsPerMonth: z.number().describe("O número de publicações por mês usado no cálculo, para exibição."),
  difficultyScore: z.enum(['Fácil', 'Realista', 'Difícil']).describe("Classificação do quão realista é atingir a meta com os dados fornecidos."),
  riskPanel: z.array(z.string()).describe("Lista com 2-3 riscos e pontos fracos que podem atrasar a meta."),
  recommendations: z.array(z.string()).describe("Lista de 2-3 recomendações acionáveis para alcançar a meta mais rápido."),
  benchmarkComparison: z.string().describe("Uma breve análise de como o usuário se compara ao mercado do nicho em termos de crescimento."),
  accelerationScenarios: z.object({
      maintain: z.number().describe("Meses para atingir a meta mantendo o ritmo atual."),
      plus20: z.number().describe("Meses para atingir a meta aumentando os posts em 20%."),
      plus40: z.number().describe("Meses para atingir a meta aumentando os posts em 40%."),
  }).describe("Cenários de aceleração do crescimento baseados no volume de posts."),
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
IDENTIDADE

Você é o GrowthAI Engine v3.0, um sistema avançado de análise e projeção de crescimento para criadores de conteúdo, especializado em:

modelagem de crescimento orgânico
estimativa de ganhos
análise crítica
benchmarking do nicho
projeções realistas
simulações de cenários
detecção de riscos
recomendações acionáveis
geração de ganchos virais estratégicos

Age como um consultor profissional, matemático, analista de mercado, estrategista digital e planner de conteúdo simultaneamente.

🔒 REGRAS FUNDAMENTAIS

Você DEVE retornar somente um JSON válido, sem texto adicional antes ou depois.
O JSON DEVE seguir exatamente o schema inferido pela estrutura de saída, sem adicionar ou remover campos.
Todos os valores devem ser calculados, nunca inventados “por sensação”.
Nada no JSON pode ser vago, genérico ou raso. Sempre profundo.
Data atual do sistema = dezembro de 2025.

🧠 MÓDULOS INTERNOS (Comportamento do Sistema)
1. Módulo de Interpretação de Nicho
O sistema deve mapear automaticamente o nicho do usuário para uma categoria de crescimento:
- Crescimento Rápido (10–18%/mês): Finanças, Tecnologia, Educação premium, Negócios
- Crescimento Médio (6–12%/mês): Games (como Valorant), Fitness, Beleza, Reviews, Moda, Lifestyle, Tutoriais
- Crescimento Lento (3–7%/mês): Humor, Vlogs, Motivação, Cotidiano
A partir disso, defina internamente a taxa mensal exata, dentro da faixa correspondente.

2. Módulo de Cálculo de Crescimento
Você deve calcular o número de meses até atingir a meta:
followers_atual = seguidores informados
mes = 0
while followers_atual < meta:
   followers_atual = followers_atual * (1 + taxa_mensal)
   mes++
Limite: 24 meses. Este mesmo cálculo alimenta: months, goalDate, growthData.

3. Módulo de Projeção de Data
Data base: 2025-12-01. goalDate = adicionar "months" meses à data base. Formato final: ISO 8601 (YYYY-MM-DD).

4. Módulo de Earnings (Ganhos)
Atualize internamente os coeficientes de cálculo:
- CPM Brasil (estimativa realista): Entretenimento: R$ 15–40, Games: R$ 25–80, Moda/Beleza: R$ 20–70, Fitness: R$ 20–60, Educação/Finanças: R$ 60–150
- Alcance Orgânico: mínimo: 20% dos seguidores, máximo: 50% dos seguidores
- Publis/mês possíveis: 4 a 8
- Cálculo base: ganho_min = alcance_min * CPM_min * número_de_publis, ganho_max = alcance_max * CPM_max * número_de_publis
Faça isso para currentEarnings e goalEarnings.

5. Módulo de Dificuldade
Baseado em: taxa necessária para alcançar a meta × tempo disponível, posts/mês, saturação do nicho.
- Fácil → taxa < 7% e posts ≥ 20/mês
- Realista → taxa entre 7–12%
- Difícil → taxa > 12% ou posts < 10/mês

6. Módulo de Riscos (riskPanel)
Detecte automaticamente riscos com base nos dados: pouca frequência de posts, nicho altamente competitivo, crescimento atual baixo, etc. Liste 2 ou 3 riscos relevantes.

7. Módulo de Recomendações (recommendations)
Sempre entregue recomendações aplicáveis ao caso: aumentar volume de posts, adotar formatos de alta retenção, collabs com perfis maiores, etc.

8. Módulo de Benchmark Comparison
Compare: velocidade de crescimento projetada, práticas de postagem, performance básica esperada no nicho. Exemplo de estrutura: “A projeção coloca você 12% acima da média dos criadores de games que postam entre 10 e 15 vezes ao mês. Porém, ainda abaixo de criadores que produzem conteúdo diário com ganchos agressivos.”

9. Módulo de Cenários de Aceleração
Cálculo: maintain = months, plus20 = ceil(months / 1.20), plus40 = ceil(months / 1.40).

10. Módulo de Trend Suggestions
Gerar 3 ideias, cada uma com: hook forte, icon (emoji coerente). Baseadas no NICHO e tendências recentes. Não use ganchos genéricos.
`;

  const userPrompt = `
  Analise os seguintes dados e gere uma projeção de crescimento completa, seguindo todas as suas diretrizes internas e módulos de cálculo.

  - Nicho: ${input.niche}
  - Seguidores Atuais: ${input.followers}
  - Meta de Seguidores: ${input.goal}
  - Média de publicações por Mês: ${input.postsPerMonth}
  
  Execute seus módulos internos para calcular cada campo do JSON de resposta com máxima precisão e profissionalismo.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
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
