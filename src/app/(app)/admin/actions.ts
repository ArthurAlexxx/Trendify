'use server';

import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { Plan, UserRole } from '@/lib/types';

// Schema for changing a user's plan
const changePlanSchema = z.object({
  targetUserId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  newPlan: z.enum(['free', 'pro', 'premium']),
  newCycle: z.enum(['monthly', 'annual']).optional(),
  adminUserId: z.string().min(1, 'O ID do administrador é obrigatório.'),
});

type ChangePlanInput = z.infer<typeof changePlanSchema>;

const changeRoleSchema = z.object({
  targetUserId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  newRole: z.enum(['user', 'admin']),
  adminUserId: z.string().min(1, 'O ID do administrador é obrigatório.'),
});

type ChangeRoleInput = z.infer<typeof changeRoleSchema>;


interface ActionState {
  success?: boolean;
  error?: string;
}

/**
 * Checks if the calling user has an 'admin' role in Firestore.
 * This is a secure, server-side check.
 * @param auth - The Firebase Admin Auth instance.
 * @param firestore - The Firebase Admin Firestore instance.
 * @param adminUserId - The UID of the user making the request.
 * @returns {Promise<boolean>} - True if the user is an admin.
 */
async function verifyAdminStatus(auth: ReturnType<typeof getAuth>, firestore: ReturnType<typeof getFirestore>, adminUserId: string): Promise<boolean> {
    const userDoc = await firestore.collection('users').doc(adminUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return false;
    }
    return true;
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

    // Verify if the calling user is an admin
    const isCallerAdmin = await verifyAdminStatus(auth, firestore, adminUserId);
    if (!isCallerAdmin) {
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


/**
 * A secure server action for an administrator to change a user's role.
 */
export async function changeUserRoleAction(
  input: ChangeRoleInput
): Promise<ActionState> {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados da requisição inválidos.' };
  }

  const { targetUserId, newRole, adminUserId } = parsed.data;

   try {
    const { auth, firestore } = initializeFirebaseAdmin();

    const isCallerAdmin = await verifyAdminStatus(auth, firestore, adminUserId);
    if (!isCallerAdmin) {
      return { error: 'Permissão negada. Apenas administradores podem alterar cargos.' };
    }

    const userRef = firestore.collection('users').doc(targetUserId);
    await userRef.update({ role: newRole });

    return { success: true };
  } catch (e: any) {
    console.error('[changeUserRoleAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido ao alterar o cargo.' };
  }
}
