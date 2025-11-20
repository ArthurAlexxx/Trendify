
'use server';

import { z } from 'zod';
import OpenAI from 'openai';
import {
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  getFirestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server-init';


const firestore = getFirestore(initializeFirebase());

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
  input: z.infer<typeof formSchema>
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
    if (!content) throw new Error('No content returned from OpenAI.');

    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('No valid JSON block found in the AI response.');

    const parsedJson = JSON.parse(jsonString);
    return GenerateWeeklyPlanOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error in generateWeeklyPlan:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error.';
    throw new Error(`Failed to generate plan from AI: ${errorMessage}`);
  }
}

async function clearCollection(collectionPath: string) {
  const q = query(collection(firestore, collectionPath));
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(firestore);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function generateWeeklyPlanAction(
  prevState: WeeklyPlanState,
  formData: FormData
): Promise<WeeklyPlanState> {
  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: 'Por favor, preencha todos os campos obrigatórios.' };
  }

  try {
    const result = await generateWeeklyPlan(parsed.data);

    // Limpa coleções antigas e adiciona novos dados
    await clearCollection('roteiro');
    await clearCollection('dadosGrafico');
    
    const batch = writeBatch(firestore);

    // Adiciona o novo roteiro
    const roteiroRef = doc(collection(firestore, 'roteiro'));
    batch.set(roteiroRef, {
      items: result.roteiro,
      createdAt: serverTimestamp(),
    });

    // Adiciona os novos dados do gráfico
    result.desempenhoSimulado.forEach((ponto) => {
      const pontoRef = doc(collection(firestore, 'dadosGrafico'));
      batch.set(pontoRef, ponto);
    });

    await batch.commit();

    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate plan: ${errorMessage}` };
  }
}
