
'use server';

import { z } from 'zod';
import { callOpenAI } from '@/lib/openai-client';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { PlanoSemanal } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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
  items: z
    .array(ItemRoteiroSchema)
    .describe(
      'Um array de 7 itens, um para cada dia da semana, com tarefas de conteúdo.'
    ),
  desempenhoSimulado: z
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

const systemPrompt = `Você é uma IA especialista em crescimento de influenciadores, estratégias de conteúdo, análise de dados, criação de roteiros e otimização de campanhas com marcas. Sua função é atuar como um Estrategista Chefe.
Sempre entregue respostas profundas, claras, práticas e extremamente profissionais.
Ao responder, utilize a mentalidade de: consultor de marketing, estrategista digital, analista de dados.
Lembre-se, a data atual é dezembro de 2025.
Você DEVE responder com um objeto JSON válido, e NADA MAIS, estritamente conforme o schema Zod fornecido.
  
{{#if totalFollowerGoal}}
A meta principal é atingir {{totalFollowerGoal}} seguidores no total (Instagram + TikTok).
{{else if instagramFollowerGoal}}
A meta principal é atingir {{instagramFollowerGoal}} seguidores no Instagram. Priorize estratégias para essa plataforma.
{{else if tiktokFollowerGoal}}
A meta principal é atingir {{tiktokFollowerGoal}} seguidores no TikTok. Priorize estratégias para essa plataforma.
{{else}}
Nenhuma meta de seguidores específica foi definida.
{{/if}}

Analise os seguintes dados e gere um plano de conteúdo semanal completo, atuando como um Estrategista Chefe.

- Objetivo da Semana: "{{objective}}"
- Nicho do Criador: {{niche}}
- Estatísticas Atuais: {{currentStats}}

Siga as diretrizes para cada campo JSON:
- items: Crie um array com exatamente 7 objetos (Segunda a Domingo). Cada objeto deve ter 'dia', 'tarefa' (específica, acionável e criativa), 'detalhes' (um passo a passo claro) e 'concluido' (sempre false). As tarefas devem ser uma mistura de produção de conteúdo, interação e análise.
- desempenhoSimulado: Crie um array de 7 objetos (Seg a Dom) para um gráfico, com 'data', 'alcance' (int) e 'engajamento' (int). A simulação deve ser realista, variando conforme as tarefas do dia (dias de post têm picos).
- effortLevel: Classifique o esforço da semana como 'Baixo', 'Médio' ou 'Alto', com base na complexidade e volume das tarefas.
- priorityIndex: Identifique e liste as 3 tarefas da semana com o maior potencial de impacto para atingir o objetivo principal.
- realignmentTips: Ofereça um conselho estratégico sobre como o usuário pode se realinhar caso perca 1 ou 2 dias do plano. Ex: "Se perder um dia de post, combine o tema com o do dia seguinte ou foque em dobrar a interação no fim de semana para compensar."
`;

async function generateWeeklyPlan(
  input: FormSchemaType
): Promise<GenerateWeeklyPlanOutput> {
  const result = await callOpenAI<typeof GenerateWeeklyPlanOutputSchema>({
    prompt: systemPrompt,
    jsonSchema: GenerateWeeklyPlanOutputSchema,
    promptData: input,
  });

  // Ensure `concluido` is set to false for all items
  return {
    ...result,
    items: result.items.map(item => ({ ...item, concluido: false })),
  };
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
  } catch (e: any) {
    if (e instanceof z.ZodError) {
        console.error("Zod Validation Error in generateWeeklyPlanAction:", e.format());
        return { error: `A resposta da IA não corresponde ao formato esperado.` };
    }
    const errorMessage = e.message || 'Ocorreu um erro desconhecido.';
    console.error("Error in generateWeeklyPlanAction:", errorMessage);
    return { error: `Falha ao gerar plano: ${errorMessage}` };
  }
}

export async function archiveAndClearWeeklyPlanAction(userId: string, planId: string, activePlan: PlanoSemanal): Promise<{success: boolean, error?: string}> {
    if (!userId || !planId || !activePlan) {
        return { success: false, error: "Dados do plano inválidos." };
    }
    
    try {
        const { firestore } = initializeFirebaseAdmin();
        const batch = firestore.batch();

        // 1. Reference to the new archived document in `ideiasSalvas`
        const ideasCollectionRef = firestore.collection(`users/${userId}/ideiasSalvas`);
        const newArchivedRef = ideasCollectionRef.doc();

        // 2. Set the data for the new archived plan
         if (activePlan.createdAt instanceof Timestamp) {
            batch.set(newArchivedRef, {
                userId: userId,
                titulo: `Plano Concluído de ${activePlan.createdAt.toDate().toLocaleDateString('pt-BR')}`,
                conteudo: activePlan.items.map(item => `**${item.dia}:** ${item.tarefa}`).join('\n'),
                origem: "Plano Semanal",
                concluido: true, // Mark as completed
                createdAt: activePlan.createdAt,
                completedAt: Timestamp.now(), // Set completion date
                aiResponseData: activePlan,
            });
        }

        // 3. Reference to the active plan to be deleted
        const activePlanRef = firestore.doc(`users/${userId}/weeklyPlans/${planId}`);
        batch.delete(activePlanRef);

        // 4. Commit all operations
        await batch.commit();

        return { success: true };
    } catch(e: any) {
        console.error("Error archiving and clearing plan:", e);
        return { success: false, error: e.message || "Erro desconhecido ao arquivar plano." };
    }
}
