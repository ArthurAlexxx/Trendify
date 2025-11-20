'use server';

import OpenAI from 'openai';
import { z } from 'zod';

// Esquema de saída esperado da IA
const GenerateVideoIdeasOutputSchema = z.object({
  gancho: z.string().describe('Um gancho de 2-3 segundos, otimizado para parar a rolagem e gerar curiosidade imediata.'),
  script: z.string().describe('Um roteiro detalhado e conciso, com indicações de cena e narração, estruturado para reter a atenção.'),
  cta: z.string().describe('Uma chamada para ação clara, convincente e alinhada ao objetivo do vídeo.'),
  takes: z.string().describe('Uma lista de cenas ou tomadas específicas para gravar, facilitando a produção do conteúdo.'),
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
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
  targetAudience: z
    .string()
    .min(3, 'Target audience must be at least 3 characters.'),
  platform: z.enum(['instagram', 'tiktok']),
  videoFormat: z.string().min(1, 'Video format is required.'),
  tone: z.string().min(1, 'Tone of voice is required.'),
  objective: z.string().min(1, 'Objective is required.'),
});

type VideoIdeasState = {
  data?: GenerateVideoIdeasOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateVideoIdeas(
  input: z.infer<typeof formSchema>
): Promise<GenerateVideoIdeasOutput> {
  const systemPrompt = `Você é um estrategista de conteúdo de classe mundial e especialista em vídeos virais para criadores de conteúdo no Instagram e TikTok.
Sua tarefa é gerar uma ideia de vídeo completa, criativa, estratégica e pronta para ser executada, baseada nos requisitos do usuário.
Pense como um produtor de conteúdo que entende de algoritmos, retenção e engajamento.
Você DEVE responder em um objeto JSON válido que se conforme estritamente ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON.`;

  const userPrompt = `
  Gere uma ideia de vídeo completa com base nos seguintes requisitos:

  - Tópico: ${input.topic}
  - Público-alvo: ${input.targetAudience}
  - Plataforma: ${input.platform}
  - Formato do Vídeo: ${input.videoFormat}
  - Tom de Voz: ${input.tone}
  - Objetivo Principal: ${input.objective}

  Para cada campo do JSON, siga estas diretrizes:
  - gancho: Crie uma frase ou cena de 2-3 segundos que seja impossível de ignorar. Deve gerar curiosidade, polêmica ou identificação imediata.
  - script: Escreva um roteiro claro e conciso. Inclua sugestões de cenas (ex: "[CENA: Close-up no produto]"), narração e timing. Deve ter uma introdução (o gancho), um desenvolvimento (o valor) e uma conclusão (o CTA).
  - cta: A chamada para ação deve ser direta e incentivar o comportamento desejado (ex: "Comente 'EU QUERO' para receber o link", "Siga para mais dicas como esta").
  - takes: Descreva uma lista de tomadas simples e práticas que o criador precisa gravar. Ex: "1. Take do seu rosto falando para a câmera. 2. Take de unboxing do produto. 3. Take mostrando o resultado final."
  - suggestedPostTime: Com base na plataforma, sugira um dia e horário de pico para postagem (ex: "Sexta-feira, 18:30h" ou "Domingo, 20:00h").
  - trendingSong: Pesquise e sugira uma música que esteja genuinamente em alta AGORA na plataforma especificada e que combine com a vibe do vídeo. Inclua o nome do artista.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const parsedJson = JSON.parse(content);
    return GenerateVideoIdeasOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to generate video ideas from AI.');
  }
}

export async function generateVideoIdeasAction(
  prevState: VideoIdeasState,
  formData: FormData
): Promise<VideoIdeasState> {
  const parsed = formSchema.safeParse({
    topic: formData.get('topic'),
    targetAudience: formData.get('targetAudience'),
    platform: formData.get('platform'),
    videoFormat: formData.get('videoFormat'),
    tone: formData.get('tone'),
    objective: formData.get('objective'),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Invalid input.' };
  }

  try {
    const result = await generateVideoIdeas(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate ideas: ${errorMessage}` };
  }
}
