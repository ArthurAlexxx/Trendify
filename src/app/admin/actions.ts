
'use server';

import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { Plan } from '@/lib/types';

// Schema for changing a user's plan
const changePlanSchema = z.object({
  targetUserId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  newPlan: z.enum(['free', 'pro', 'premium']),
  newCycle: z.enum(['monthly', 'annual']).optional(),
  adminUserId: z.string().min(1, 'O ID do administrador é obrigatório.'),
});

type ChangePlanInput = z.infer<typeof changePlanSchema>;

interface ActionState {
  success?: boolean;
  error?: string;
}

/**
 * A secure server action for an administrator to change a user's subscription plan.
 */
export async function changeUserPlanAction(
  input: ChangePlanInput
): Promise<ActionState> {
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados inválidos.' };
  }

  const { targetUserId, newPlan, newCycle, adminUserId } = parsed.data;

  try {
    const { auth, firestore } = initializeFirebaseAdmin();

    // Verify if the calling user is an admin by checking their custom claims
    const adminUser = await auth.getUser(adminUserId);
    if (adminUser.customClaims?.['role'] !== 'admin') {
      return { error: 'Permissão negada. Apenas administradores podem alterar planos.' };
    }
    
    const userRef = firestore.collection('users').doc(targetUserId);

    let expiresAt: Timestamp | null = null;
    let newStatus: 'active' | 'inactive' = 'inactive';

    if (newPlan !== 'free') {
        const now = new Date();
        newStatus = 'active';
        if (newCycle === 'annual') {
            expiresAt = Timestamp.fromDate(new Date(now.setFullYear(now.getFullYear() + 1)));
        } else { // monthly
            expiresAt = Timestamp.fromDate(new Date(now.setMonth(now.getMonth() + 1)));
        }
    }
    
    const updatePayload = {
      'subscription.plan': newPlan,
      'subscription.status': newStatus,
      'subscription.cycle': newPlan === 'free' ? null : newCycle,
      'subscription.expiresAt': expiresAt,
    };
    
    await userRef.update(updatePayload);

    return { success: true };
  } catch (e: any) {
    console.error('[changeUserPlanAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido ao alterar o plano.' };
  }
}
