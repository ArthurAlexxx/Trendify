
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';

async function getScheduledContentForTomorrow(firestore: ReturnType<typeof getFirestore>) {
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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

    const tomorrowTasks = allTasks.filter(task => {
        if (!task.date || typeof task.date.toDate !== 'function') return false;
        const taskDate = task.date.toDate();
        return taskDate >= tomorrowStart && taskDate <= tomorrowEnd;
    });

    return tomorrowTasks;
}

async function getUserEmail(firestore: ReturnType<typeof getFirestore>, userId: string) {
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }

    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    return userDoc.data()?.email;
}


export async function GET(req: NextRequest) {
    let firestore: ReturnType<typeof getFirestore>;
    try {
        firestore = initializeFirebaseAdmin().firestore;
    } catch (e: any) {
        console.error('CRITICAL: Failed to initialize Firebase Admin in cron route.', e.message);
        return NextResponse.json({ error: 'Internal Server Error: Could not connect to database.' }, { status: 500 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    

    if (!cronSecret) {
        console.error('[Cron Job] CRITICAL: CRON_SECRET is not set in environment variables.');
        if (process.env.VERCEL_ENV === 'production') {
             return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
        }
        return NextResponse.json({ error: 'CRON_SECRET environment variable is not set.' }, { status: 500 });
    }
    
    if (process.env.VERCEL_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[Cron Job] Unauthorized access attempt. Headers did not match.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('[Cron Job] N8N_WEBHOOK_URL is not set.');
        return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }

    try {
        const tasks = await getScheduledContentForTomorrow(firestore);
        if (tasks.length === 0) {
            return NextResponse.json({ message: 'No tasks scheduled for tomorrow.' });
        }
        
        const enrichedTasks = await Promise.all(tasks.map(async (task) => {
            const email = await getUserEmail(firestore, task.userId);
            return {
                ...task,
                date: task.date.toDate().toISOString(),
                userEmail: email,
            };
        }));
        
        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrichedTasks),
        });

        if (!n8nResponse.ok) {
            const errorBody = await n8nResponse.text();
            console.error(`[Cron Job] Error sending data to n8n: Status ${n8nResponse.status}`, errorBody);
            throw new Error(`n8n webhook failed with status ${n8nResponse.status}`);
        }

        return NextResponse.json({ 
            message: `Successfully sent ${enrichedTasks.length} tasks to n8n.`,
        });

    } catch (error: any) {
        const errorMessage = error.details || error.message || 'Unknown Firestore error.';
        console.error(`[Cron Job] Error during execution: ${errorMessage}`, error);
        
        return NextResponse.json({ error: 'Internal Server Error: ' + errorMessage }, { status: 500 });
    }
}
