
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// --- Funções Auxiliares ---

/**
 * Busca no Firestore todos os conteúdos agendados para o dia seguinte.
 */
async function getScheduledContentForTomorrow(firestore: ReturnType<typeof getFirestore>) {
    if (!firestore) {
        throw new Error("O Firestore não está inicializado.");
    }
    
    const now = new Date();
    // Ajusta a data para o fuso horário de São Paulo (UTC-3)
    const spTimezoneOffset = 3 * 60 * 60 * 1000;
    const nowInSaoPaulo = new Date(now.getTime() - spTimezoneOffset);

    const tomorrow = new Date(nowInSaoPaulo.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    const snapshot = await firestore.collectionGroup('conteudoAgendado').get();
    
    if (snapshot.empty) {
        return [];
    }

    const allTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    // Filtra as tarefas para o dia de amanhã
    const tomorrowTasks = allTasks.filter(task => {
        if (!task.date || typeof task.date.toDate !== 'function') return false;
        const taskDate = task.date.toDate();
        return taskDate >= tomorrowStart && taskDate <= tomorrowEnd;
    });

    return tomorrowTasks;
}

/**
 * Busca o e-mail de um usuário no Firestore.
 */
async function getUserEmail(firestore: ReturnType<typeof getFirestore>, userId: string): Promise<string | null> {
    if (!firestore) {
        throw new Error("O Firestore não está inicializado.");
    }

    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    return userDoc.data()?.email;
}

// --- Rota da API ---

export async function GET(req: NextRequest) {
    let firestore: ReturnType<typeof getFirestore>;
    try {
        firestore = initializeFirebaseAdmin().firestore;
    } catch (e: any) {
        console.error('CRÍTICO: Falha ao inicializar o Firebase Admin na rota do cron.', e.message);
        return NextResponse.json({ error: 'Erro Interno do Servidor: Não foi possível conectar ao banco de dados.' }, { status: 500 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    
    // Verificação de segurança para o cron job em produção
    if (process.env.VERCEL_ENV === 'production') {
        if (!cronSecret) {
            console.error('[Cron Job] CRÍTICO: CRON_SECRET não está definida nas variáveis de ambiente.');
            return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 });
        }
        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn('[Cron Job] Tentativa de acesso não autorizada.');
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('[Cron Job] N8N_WEBHOOK_URL não está definida.');
        return NextResponse.json({ error: 'URL do Webhook não configurada' }, { status: 500 });
    }

    try {
        const tasks = await getScheduledContentForTomorrow(firestore);
        if (tasks.length === 0) {
            return NextResponse.json({ message: 'Nenhuma tarefa agendada para amanhã.' });
        }
        
        const enrichedTasks = (await Promise.all(tasks.map(async (task) => {
            const userEmail = await getUserEmail(firestore, task.userId);
            if (!userEmail) return null;
            return { ...task, userEmail };
        }))).filter(job => job !== null);
        

        if (enrichedTasks.length === 0) {
            return NextResponse.json({ message: 'Nenhuma tarefa com usuário válido encontrada para amanhã.' });
        }

        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrichedTasks),
        });

        if (!n8nResponse.ok) {
            const errorBody = await n8nResponse.text();
            console.error(`[Cron Job] Erro ao enviar dados para o n8n: Status ${n8nResponse.status}`, errorBody);
            throw new Error(`Webhook do n8n falhou com status ${n8nResponse.status}`);
        }

        return NextResponse.json({ 
            message: `Enviados ${enrichedTasks.length} jobs de e-mail para o n8n com sucesso.`,
        });

    } catch (error: any) {
        const errorMessage = error.details || error.message || 'Erro desconhecido no Firestore.';
        console.error(`[Cron Job] Erro durante a execução: ${errorMessage}`, error);
        
        return NextResponse.json({ error: 'Erro Interno do Servidor: ' + errorMessage }, { status: 500 });
    }
}
