
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const ScriptSchema = z.object({
  gancho: z.string().describe('Um gancho de 2-3 segundos, otimizado para parar a rolagem e gerar curiosidade imediata.').optional(),
  script: z.string().describe('Um roteiro detalhado e conciso, com indicações de cena e narração, estruturado para reter a atenção.').optional(),
  cta: z.string().describe('Uma chamada para ação clara, convincente e alinhada ao objetivo do vídeo.').optional(),
});

const TrendVariationSchema = z.object({
  variacao: z.string().describe("A descrição da variação da ideia adaptada para uma tendência."),
});

const GeneratePubliProposalsOutputSchema = z.object({
  scripts: z.array(ScriptSchema).describe('Uma lista de 5 ideias de roteiros de vídeo prontos para gravar.'),
  trendVariations: z.array(TrendVariationSchema).describe('Uma lista de 2 a 3 variações das ideias de roteiro, adaptadas para tendências ou "dancinhas" atuais.'),
  conversionChecklist: z.array(z.string()).describe('Um checklist com 4 a 5 pontos essenciais para garantir a conversão do vídeo, como prova social, urgência, oferta clara, etc.'),
});

export type GeneratePubliProposalsOutput = z.infer<
  typeof GeneratePubliProposalsOutputSchema
>;

const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  targetAudience: z.string().min(10, 'O público-alvo deve ter pelo menos 10 caracteres.'),
  differentiators: z.string().min(10, 'Os diferenciais devem ter pelo menos 10 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
  extraInfo: z.string().optional(),
});


type PubliProposalsState = {
  data?: GeneratePubliProposalsOutput;
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
  // Fallback for cases where the AI might not use markdown
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // Look for the first '{' and the last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  return null;
}

async function generatePubliProposals(
  input: z.infer<typeof formSchema>
): Promise<GeneratePubliProposalsOutput> {
  const systemPrompt = `Você é um "AI Creative Director", especialista em criar campanhas de conteúdo para redes sociais que convertem.
Sua tarefa é gerar um pacote de conteúdo completo para um criador de conteúdo promover um produto ou marca.
Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Gere um pacote de conteúdo para uma publicidade ("publi") com base nos seguintes requisitos detalhados:

  - Produto/Marca a ser promovido: ${input.product}
  - Público-alvo: ${input.targetAudience}
  - Diferenciais do produto/marca: ${input.differentiators}
  - Objetivo Principal da campanha: ${input.objective}
  - Informações Adicionais (restrições, links, etc.): ${input.extraInfo || 'Nenhuma'}

  Para cada campo do JSON, siga estas diretrizes:

  - scripts: Crie EXATAMENTE 5 roteiros de vídeo distintos, cada um explorando um ângulo diferente (ex: tutorial focado no diferencial, POV do cliente, unboxing estético, problema vs. solução, etc.). Cada roteiro deve ser prático e pronto para gravar, incluindo um gancho forte (gancho), um desenvolvimento rápido (script) e uma chamada para ação clara (cta) alinhada ao objetivo. O tom de voz deve ser profissional, autêntico e apropriado para o público e produto.

  - trendVariations: Crie 2-3 sugestões de como adaptar uma das ideias de roteiro para uma tendência (trend) de áudio ou vídeo que esteja em alta no Instagram/TikTok. Seja específico. Ex: "Adapte o roteiro 3 usando o áudio 'som do momento' com a trend de dublagem X." Para cada item no array, use a chave 'variacao' para a descrição.

  - conversionChecklist: Crie um checklist com 4-5 itens acionáveis para maximizar a conversão do vídeo, baseado no objetivo principal. Se o objetivo é Vendas, inclua itens como 'Mostrar prova social (ex: comentários)' ou 'Criar senso de urgência (ex: 'últimas unidades')'. Se o objetivo é Reconhecimento, inclua 'Gancho que gere curiosidade sobre a marca' ou 'CTA para seguir o perfil'.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
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
    return GeneratePubliProposalsOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    throw new Error(`Failed to generate proposals from AI: ${errorMessage}`);
  }
}

export async function generatePubliProposalsAction(
  prevState: PubliProposalsState,
  formData: FormData
): Promise<PubliProposalsState> {
  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Invalid input.' };
  }

  try {
    const result = await generatePubliProposals(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate proposals: ${errorMessage}` };
  }
}

    
