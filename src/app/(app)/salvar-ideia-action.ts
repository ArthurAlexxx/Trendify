'use server';

import { auth } from '@/firebase-server';
import { firestore } from '@/firebase-server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';

const formSchema = z.object({
  titulo: z.string().min(1, 'O título é obrigatório.'),
  conteudo: z.string().min(1, 'O conteúdo é obrigatório.'),
  origem: z.string().min(1, 'A origem é obrigatória.'),
});

type SaveIdeaState = {
  success: boolean;
  error?: string;
};

export async function salvarIdeiaAction(
  input: z.infer<typeof formSchema>
): Promise<SaveIdeaState> {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    const parsed = formSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Dados inválidos.' };
    }

    const { titulo, conteudo, origem } = parsed.data;

    await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
      userId: user.uid,
      titulo,
      conteudo,
      origem,
      concluido: false,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { success: false, error: errorMessage };
  }
}
