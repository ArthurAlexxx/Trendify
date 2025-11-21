
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

/**
 * Gera o corpo do e-mail em HTML com o estilo do Trendify.
 */
function createStyledEmailHtml(task: any): string {
    const postDate = task.date.toDate();
    const formattedTime = format(postDate, "HH:mm", { locale: ptBR });
    const formattedDate = format(postDate, "dd 'de' MMMM", { locale: ptBR });

    const primaryColor = '#7C3AED'; // Cor principal do Trendify (roxo)

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lembrete de Postagem</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f8fafc;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: ${primaryColor}; padding: 24px; color: #ffffff; text-align: center;">
                                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">trendify</h1>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td style="padding: 32px 24px; color: #0f172a;">
                                    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 600;">Seu post está quase pronto!</h2>
                                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #475569;">
                                        Olá! Este é um lembrete amigável sobre o seu conteúdo agendado para amanhã. Prepare-se para engajar sua audiência!
                                    </p>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px;">
                                        <tr>
                                            <td>
                                                <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Título</p>
                                                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600;">${task.title}</h3>
                                                <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Formato</p>
                                                <p style="margin: 0 0 16px; font-size: 16px; font-weight: 500;">${task.contentType}</p>
                                                <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Agendado para</p>
                                                <p style="margin: 0; font-size: 16px; font-weight: 500;">${formattedDate} às ${formattedTime}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Trendify. Todos os direitos reservados.</p>
                                    <p style="margin: 4px 0 0;">Este é um e-mail automático. Por favor, não responda.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
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
        
        // Mapeia as tarefas para o formato de payload do e-mail
        const emailJobs = (await Promise.all(tasks.map(async (task) => {
            const userEmail = await getUserEmail(firestore, task.userId);
            if (!userEmail) return null; // Ignora se o e-mail não for encontrado

            return {
                userEmail: userEmail,
                subject: `🔔 Lembrete de Postagem: "${task.title}"`,
                htmlBody: createStyledEmailHtml(task),
            };
        }))).filter(job => job !== null); // Remove jobs nulos
        

        if (emailJobs.length === 0) {
            return NextResponse.json({ message: 'Nenhuma tarefa com usuário válido encontrada para amanhã.' });
        }

        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailJobs),
        });

        if (!n8nResponse.ok) {
            const errorBody = await n8nResponse.text();
            console.error(`[Cron Job] Erro ao enviar dados para o n8n: Status ${n8nResponse.status}`, errorBody);
            throw new Error(`Webhook do n8n falhou com status ${n8nResponse.status}`);
        }

        return NextResponse.json({ 
            message: `Enviados ${emailJobs.length} jobs de e-mail para o n8n com sucesso.`,
        });

    } catch (error: any) {
        const errorMessage = error.details || error.message || 'Erro desconhecido no Firestore.';
        console.error(`[Cron Job] Erro durante a execução: ${errorMessage}`, error);
        
        return NextResponse.json({ error: 'Erro Interno do Servidor: ' + errorMessage }, { status: 500 });
    }
}
