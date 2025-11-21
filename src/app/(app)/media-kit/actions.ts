
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const AiCareerPackageOutputSchema = z.object({
  executiveSummary: z
    .string()
    .describe(
      'Um parágrafo de apresentação curto e impactante, ideal para um e-mail inicial para uma marca, destacando o valor do criador.'
    ),
  pricingTiers: z.object({
    reels: z
      .string()
      .describe(
        "Faixa de preço sugerida para um único vídeo no formato Reels (ex: 'R$ 800 - R$ 1.500')."
      ),
    storySequence: z
      .string()
      .describe(
        "Faixa de preço para uma sequência de 3-5 Stories (ex: 'R$ 500 - R$ 900')."
      ),
    staticPost: z
      .string()
      .describe(
        "Faixa de preço para um post estático no feed (foto única ou carrossel) (ex: 'R$ 600 - R$ 1.200')."
      ),
    monthlyPackage: z
      .string()
      .describe(
        "Faixa de preço para um pacote mensal (ex: 2 Reels, 4 sequências de Stories) (ex: 'R$ 3.000 - R$ 5.500')."
      ),
  }),
  sampleCollaborationIdeas: z
    .array(z.string())
    .describe(
      'Uma lista de 2-3 ideias de colaboração criativas e de alto nível que se encaixam no nicho do criador e da marca alvo.'
    ),
});

export type AiCareerPackageOutput = z.infer<typeof AiCareerPackageOutputSchema>;

const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z
    .string()
    .min(10, 'Suas métricas devem ter pelo menos 10 caracteres.'),
  targetBrand: z
    .string()
    .min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type CareerPackageState = {
  data?: AiCareerPackageOutput;
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

async function getAiCareerPackage(
  input: z.infer<typeof formSchema>
): Promise<AiCareerPackageOutput> {
  const systemPrompt = `Você é um "AI Talent Manager", um agente de talentos e estrategista de negócios especialista em monetização para criadores de conteúdo.
Sua tarefa é gerar um pacote de prospecção profissional para um criador usar ao abordar marcas.
Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Gere um pacote de prospecção profissional com base nos seguintes dados do criador:

  - Nicho de Atuação: ${input.niche}
  - Métricas Principais: ${input.keyMetrics}
  - Marca Alvo (para contexto): ${input.targetBrand}

  Para cada campo do JSON, siga estas diretrizes:

  - **Pense como um especialista**: Mergulhe no nicho. Se o nicho for um jogo como 'Valorant', não fale apenas sobre skins. Fale sobre jogabilidade, estratégias, agentes, humor da comunidade, etc. Se for 'skincare', fale sobre ingredientes, rotinas, problemas de pele específicos.

  - executiveSummary: Crie um parágrafo de apresentação EM PRIMEIRA PESSOA (usando "Eu sou...", "Minha audiência..."), conciso e profissional, pronto para ser copiado e colado em um e-mail. Ele deve destacar minha especialidade, o perfil do meu público e o valor que posso agregar para uma marca como a marca alvo, mostrando que entendo do assunto.
  
  - pricingTiers: Com base nas métricas fornecidas (seguidores, engajamento), calcule e sugira faixas de preço realistas para o mercado brasileiro. Retorne uma STRING formatada para cada campo (ex: "R$ 800 - R$ 1.500"). Crie uma faixa para cada um dos seguintes formatos: 'reels', 'storySequence' (sequência de 3-5 stories), 'staticPost' (post no feed) e 'monthlyPackage' (um pacote combinado). Justifique mentalmente os valores com base em benchmarks de CPM, CPV e taxa de engajamento.

  - sampleCollaborationIdeas: Descreva 2-3 ideias de colaboração criativas e autênticas que se alinham ao nicho e à marca alvo. Evite ideias genéricas. Para um nicho de games, sugira coisas como "Série de vídeos com dicas para subir de ranking usando o mouse da marca" ou "Guia de um agente/personagem específico patrocinado pela marca de periféricos". Para um nicho de beleza, "Desafio de 30 dias documentando a transformação da pele com a linha de skincare da marca".
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
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const jsonString = extractJson(content);
    if (!jsonString) {
      throw new Error('No valid JSON block found in the AI response.');
    }

    const parsedJson = JSON.parse(jsonString);
    return AiCareerPackageOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error.';
    throw new Error(
      `Failed to generate career package from AI: ${errorMessage}`
    );
  }
}

export async function getAiCareerPackageAction(
  prevState: CareerPackageState,
  formData: FormData
): Promise<CareerPackageState> {
  const parsed = formSchema.safeParse({
    niche: formData.get('niche'),
    keyMetrics: formData.get('keyMetrics'),
    targetBrand: formData.get('targetBrand'),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Invalid input.' };
  }

  try {
    const result = await getAiCareerPackage(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate package: ${errorMessage}` };
  }
}

    
