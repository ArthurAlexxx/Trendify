
'use server';

import { initializeFirebaseAdmin } from '@/firebase/admin';
import { z } from 'zod';

interface ActionState {
  success?: boolean;
  error?: string;
}

const resetSchema = z.object({
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
});


/**
 * Resets the metrics from the last sync for both platforms, but keeps the handles.
 */
export async function resetLastSyncAction(
  input: { userId: string }
): Promise<ActionState> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'ID do usuário inválido.' };
  }

  const { userId } = parsed.data;

  try {
    const { firestore } = initializeFirebaseAdmin();
    const userRef = firestore.collection('users').doc(userId);

    const updatePayload = {
      // Instagram
      'instagramFollowers': null,
      'instagramAverageViews': null,
      'instagramAverageLikes': null,
      'instagramAverageComments': null,
      'lastInstagramSync': null,
      // TikTok
      'tiktokFollowers': null,
      'tiktokAverageViews': null,
      'tiktokAverageLikes': null,
      'tiktokAverageComments': null,
      'lastTikTokSync': null,
    };

    await userRef.update(updatePayload);

    // Optional: Delete recent posts if needed, but for now just resetting metrics.
    // This keeps the user connected but ready for a fresh sync.

    return { success: true };
  } catch (e: any) {
    console.error('[resetLastSyncAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido.' };
  }
}

/**
 * Resets all social media metrics and handles for a user, and deletes all synced posts.
 */
export async function resetAllMetricsAction(
  input: { userId: string }
): Promise<ActionState> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'ID do usuário inválido.' };
  }

  const { userId } = parsed.data;

  try {
    const { firestore } = initializeFirebaseAdmin();
    const userRef = firestore.collection('users').doc(userId);
    const batch = firestore.batch();

    // 1. Reset user profile fields
    const resetPayload = {
        instagramHandle: null,
        instagramFollowers: null,
        instagramAverageViews: null,
        instagramAverageLikes: null,
        instagramAverageComments: null,
        lastInstagramSync: null,
        tiktokHandle: null,
        tiktokFollowers: null,
        tiktokAverageViews: null,
        tiktokAverageLikes: null,
        tiktokAverageComments: null,
        lastTikTokSync: null,
    };
    batch.update(userRef, resetPayload);
    
    // 2. Delete all documents in instagramPosts subcollection
    const instaPostsRef = userRef.collection('instagramPosts');
    const instaPostsSnap = await instaPostsRef.get();
    instaPostsSnap.forEach(doc => batch.delete(doc.ref));

    // 3. Delete all documents in tiktokPosts subcollection
    const tiktokPostsRef = userRef.collection('tiktokPosts');
    const tiktokPostsSnap = await tiktokPostsRef.get();
    tiktokPostsSnap.forEach(doc => batch.delete(doc.ref));

    // Commit the batch
    await batch.commit();

    return { success: true };
  } catch (e: any) {
    console.error('[resetAllMetricsAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido.' };
  }
}

const cancelSubscriptionSchema = z.object({
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  asaasSubscriptionId: z.string().min(1, 'O ID da assinatura Asaas é obrigatório.'),
});

/**
 * Cancels a subscription on Asaas and updates the user's status in Firestore.
 */
export async function cancelAsaasSubscriptionAction(
  input: z.infer<typeof cancelSubscriptionSchema>
): Promise<ActionState> {
  const parsed = cancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados inválidos.' };
  }

  const { userId, asaasSubscriptionId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  }

  try {
    // Step 1: Cancel subscription on Asaas
    const response = await fetch(`https://api-sandbox.asaas.com/v3/subscriptions/${asaasSubscriptionId}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'access_token': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle cases where the subscription might already be canceled or doesn't exist
      if (response.status === 404) {
         console.warn(`[cancelAsaas] Tentativa de cancelar assinatura não encontrada na Asaas: ${asaasSubscriptionId}`);
      } else {
        console.error(`[cancelAsaas] Erro ao cancelar assinatura ${asaasSubscriptionId}:`, errorData);
        throw new Error(errorData.errors?.[0]?.description || 'Falha ao cancelar a assinatura no gateway de pagamento.');
      }
    }
    
    // Step 2: Update user's status in Firestore regardless of Asaas API result (to ensure user is downgraded)
    const { firestore } = initializeFirebaseAdmin();
    const userRef = firestore.collection('users').doc(userId);

    const updatePayload = {
      'subscription.status': 'inactive',
      'subscription.plan': 'free',
      'subscription.expiresAt': null,
      'subscription.cycle': null,
      'subscription.asaasSubscriptionId': null, // Clear the ID
    };

    await userRef.update(updatePayload);

    return { success: true };

  } catch (e: any) {
    console.error(`[cancelAsaasSubscriptionAction] Erro no fluxo para ${userId}:`, e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
