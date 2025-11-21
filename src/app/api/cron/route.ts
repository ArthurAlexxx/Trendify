
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// This function is moved inside GET to ensure it runs on each invocation
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

    // Filter in memory to avoid complex index requirements
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
    // Moved Firebase Admin initialization inside the handler
    let firestore: ReturnType<typeof getFirestore>;
    try {
        firestore = initializeFirebaseAdmin().firestore;
    } catch (e: any) {
        console.error('CRITICAL: Failed to initialize Firebase Admin in cron route.', e.message);
        return NextResponse.json({ error: 'Internal Server Error: Could not connect to database.' }, { status: 500 });
    }

    console.log('[Cron Job] Received GET request.');
    // 1. Authenticate the request
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    
    console.log(`[Cron Job] Auth Header Received: ${authHeader ? 'Present' : 'Missing'}`);
    if (authHeader) {
        console.log(`[Cron Job] Auth Header Value: ${authHeader.substring(0, 15)}...`); // Log first few chars
    }

    if (!cronSecret) {
        console.error('[Cron Job] CRITICAL: CRON_SECRET is not set in environment variables.');
        // Don't leak info in production
        if (process.env.VERCEL_ENV === 'production') {
             return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
        }
        return NextResponse.json({ error: 'CRON_SECRET environment variable is not set.' }, { status: 500 });
    }
    
    console.log(`[Cron Job] VERCEL_ENV: ${process.env.VERCEL_ENV}`);

    // Allow testing in preview without secret, but enforce in production
    if (process.env.VERCEL_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[Cron Job] Unauthorized access attempt. Headers did not match.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron Job] Authorization successful.');

    // 2. Get the webhook URL with a fallback for testing
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('[Cron Job] N8N_WEBHOOK_URL is not set.');
        return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }
     console.log('[Cron Job] N8N Webhook URL found.');

    try {
        const tasks = await getScheduledContentForTomorrow(firestore);
        if (tasks.length === 0) {
            console.log('[Cron Job] No tasks scheduled for tomorrow.');
            return NextResponse.json({ message: 'No tasks scheduled for tomorrow.' });
        }

        console.log(`[Cron Job] Found ${tasks.length} tasks for tomorrow. Preparing to send to n8n.`);
        
        const enrichedTasks = await Promise.all(tasks.map(async (task) => {
            const email = await getUserEmail(firestore, task.userId);
            return {
                ...task,
                // Ensure date is a serializable string format
                date: task.date.toDate().toISOString(),
                userEmail: email,
            };
        }));
        
        console.log('[Cron Job] Sending tasks to n8n webhook...');
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

        console.log('[Cron Job] Successfully sent tasks to n8n webhook.');

        return NextResponse.json({ 
            message: `Successfully sent ${enrichedTasks.length} tasks to n8n.`,
        });

    } catch (error: any) {
        const errorMessage = error.details || error.message || 'Unknown Firestore error.';
        console.error(`[Cron Job] Error during execution: ${errorMessage}`, error);
        
        return NextResponse.json({ error: 'Internal Server Error: ' + errorMessage }, { status: 500 });
    }
}
