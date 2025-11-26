
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

// Esquema de saída esperado da IA
const GenerateVideoIdeasOutputSchema = z.object({
  gancho: z.string().describe('Um gancho de 2-3 segundos, otimizado para parar a rolagem e gerar curiosidade imediata.'),
  script: z.string().describe('Um roteiro detalhado e conciso, com indicações de cena e narração, estruturado para reter a atenção.'),
  cta: z.string().describe('Uma chamada para ação clara, convincente e alinhada ao objetivo do vídeo.'),
  takes: z.array(z.string()).describe('Uma lista de cenas ou tomadas específicas para gravar, facilitando a produção do conteúdo.'),
  suggestedPostTime: z
    .string()
    .describe('O melhor horário sugerido para postar o vídeo na plataforma indicada, visando máximo alcance.'),
  trendingSong: z
    .string()
    .describe('Uma música atualmente em alta que se encaixe perfeitamente no estilo do vídeo.'),
});

export type GenerateVideoIdeasOutput = z.infer<
  typeof GenerateVideoIdeasOutputSchema
>;

// Esquema de entrada do formulário
const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;


type VideoIdeasState = {
  data?: GenerateVideoIdeasOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract JSON from a string
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

async function generateVideoIdeas(
  input: z.infer<typeof formSchema>
): Promise<GenerateVideoIdeasOutput> {
  const systemPrompt = `Você é um estrategista de conteúdo de classe mundial e especialista em vídeos virais para criadores de conteúdo no Instagram e TikTok.
Sua tarefa é gerar uma ideia de vídeo completa, criativa, estratégica e pronta para ser executada, baseada nos requisitos do usuário.
Pense como um produtor de conteúdo que entende de algoritmos, retenção e engajamento.
Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON.`;

  const userPrompt = `
  Gere uma ideia de vídeo completa com base nos seguintes requisitos:

  - Tópico: ${input.topic}
  - Público-alvo: ${input.targetAudience}
  - Objetivo Principal: ${input.objective}

  Para cada campo do JSON, siga estas diretrizes:
  - gancho: Crie uma frase ou cena de 2-3 segundos que gere curiosidade, quebre uma crença comum ou apresente uma solução contraintuitiva. Evite clichês.
  - script: Escreva um roteiro claro e conciso como um único texto (string). Estruture-o em três partes: Introdução (o gancho), Desenvolvimento (a entrega de valor/o miolo do conteúdo) e Conclusão (o CTA). Inclua sugestões de cenas entre colchetes. Exemplo: "[CENA: Close-up no produto] Você investe em produtos caros, mas o erro pode estar na ordem de aplicação. A regra de ouro é: do mais leve ao mais denso... [CENA: Mostrando a textura de um sérum e depois de um creme]". O script deve ser detalhado o suficiente para ser gravado.
  - cta: A chamada para ação deve ser direta e incentivar o comportamento desejado (ex: "Comente 'EU QUERO' para receber o link", "Siga para mais dicas como esta").
  - takes: Descreva uma lista de tomadas simples e práticas que o criador precisa gravar. Ex: ["Take do seu rosto falando para a câmera.", "Take de unboxing do produto.", "Take mostrando o resultado final."]. Retorne um array de strings.
  - suggestedPostTime: Com base na plataforma (Instagram/Tiktok), sugira um dia e horário de pico para postagem (ex: "Sexta-feira, 18:30h" ou "Domingo, 20:00h").
  - trendingSong: Pesquise e sugira uma música que esteja genuinamente em alta AGORA no Instagram ou TikTok e que combine com a vibe do vídeo. Inclua o nome do artista.
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
      throw new Error('A IA não retornou nenhum conteúdo.');
    }

    const jsonString = extractJson(content);
    if (!jsonString) {
      throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');
    }

    const parsedJson = JSON.parse(jsonString);
    // This will now parse the script correctly if it's an object
    if (typeof parsedJson.script === 'object' && parsedJson.script !== null) {
      // Assuming the object has a meaningful property, or just stringify it
      parsedJson.script = JSON.stringify(parsedJson.script, null, 2);
    }
    return GenerateVideoIdeasOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar ideias com a IA: ${errorMessage}`);
  }
}

export async function generateVideoIdeasAction(
  prevState: VideoIdeasState,
  formData: FormSchemaType,
): Promise<VideoIdeasState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Input inválido.' };
  }

  try {
    const result = await generateVideoIdeas(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar ideias: ${errorMessage}` };
  }
}
