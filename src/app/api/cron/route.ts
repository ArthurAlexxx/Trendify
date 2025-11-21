
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// Initialize Firebase Admin
let firestore: ReturnType<typeof getFirestore>;
try {
    const { firestore: fs } = initializeFirebaseAdmin();
    firestore = fs;
} catch (e: any) {
    console.error('CRITICAL: Failed to initialize Firebase Admin in cron route.', e.message);
}


async function getScheduledContentForTomorrow() {
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));


    const snapshot = await firestore.collectionGroup('conteudoAgendado')
        .where('date', '>=', tomorrowStart)
        .where('date', '<=', tomorrowEnd)
        .get();
    
    if (snapshot.empty) {
        return [];
    }

    const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    return tasks;
}

async function getUserEmail(userId: string) {
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
    // 1. Authenticate the request
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    // Allow testing in preview without secret, but enforce in production
    if (process.env.VERCEL_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the webhook URL with a fallback for testing
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('N8N_WEBHOOK_URL is not set.');
        return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }

    try {
        const tasks = await getScheduledContentForTomorrow();
        if (tasks.length === 0) {
            return NextResponse.json({ message: 'No tasks scheduled for tomorrow.' });
        }

        const webhookPromises = [];

        for (const task of tasks) {
            const userId = task.userId;
            const email = await getUserEmail(userId);

            if (email) {
                const payload = {
                    email: email,
                    taskTitle: task.title,
                    taskDate: (task.date as Timestamp).toDate().toISOString(),
                    contentType: task.contentType,
                    notes: task.notes,
                };
                
                // Fire and forget: We don't wait for the webhook to respond
                const promise = fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }).catch(err => console.error(`Failed to send webhook for task ${task.id}:`, err));
                
                webhookPromises.push(promise);
            }
        }
        
        // While we don't block the response for the webhooks, 
        // we can log if they all initiated correctly.
        await Promise.all(webhookPromises);

        return NextResponse.json({ message: `Successfully triggered ${webhookPromises.length} webhooks.` });

    } catch (error) {
        console.error('Error in cron job:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
