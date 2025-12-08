
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
