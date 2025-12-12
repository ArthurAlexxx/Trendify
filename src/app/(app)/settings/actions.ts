
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
    return { error: 'ID de usuário inválido.' };
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

    return { success: true };
  } catch (e: any) {
    console.error('[resetLastSyncAction] Error:', e);
    return { error: e.message || 'Erro desconhecido ao resetar sincronização.' };
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
    return { error: 'ID de usuário inválido.' };
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
    return { error: e.message || 'Erro desconhecido ao resetar métricas.' };
  }
}

const subscriptionActionSchema = z.object({
  userId: z.string().min(1, 'ID de usuário obrigatório.'),
  asaasSubscriptionId: z.string().min(1, 'ID da assinatura Asaas obrigatório.'),
});

/**
 * Cancels a subscription on Asaas and updates the user's status in Firestore.
 */
export async function cancelAsaasSubscriptionAction(
  input: z.infer<typeof subscriptionActionSchema>
): Promise<ActionState> {
  const parsed = subscriptionActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados de cancelamento inválidos.' };
  }

  const { userId, asaasSubscriptionId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY ausente.' };
  }

  try {
    // Step 1: Cancel subscription on Asaas
    const response = await fetch(`https://api.asaas.com/v3/subscriptions/${asaasSubscriptionId}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'access_token': apiKey,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ errors: [{ description: "Resposta de erro inválida da API." }] }));
      if (response.status === 404) {
         console.warn(`[cancelAsaas] Tentativa de cancelar assinatura não encontrada na Asaas: ${asaasSubscriptionId}`);
      } else {
        console.error(`[cancelAsaas] Erro ao cancelar assinatura ${asaasSubscriptionId}:`, errorData);
        throw new Error(errorData.errors?.[0]?.description || 'Falha ao cancelar assinatura no gateway.');
      }
    }
    
    // Step 2: Update user's status in Firestore
    const { firestore } = initializeFirebaseAdmin();
    const userRef = firestore.collection('users').doc(userId);

    const updatePayload = {
      'subscription.status': 'inactive',
    };

    await userRef.update(updatePayload);

    return { success: true };

  } catch (e: any) {
    console.error(`[cancelAsaasSubscriptionAction] Erro para ${userId}:`, e);
    return { error: e.message || 'Erro de comunicação com o provedor de pagamento.' };
  }
}
