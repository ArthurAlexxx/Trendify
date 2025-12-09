'use server';

import { analyzeVideo as analyzeVideoFlow, type AnalyzeVideoOutput } from '@/ai/flows/analyze-video-flow';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Re-export the analyzeVideo function to be used as a Server Action.
 */
export const analyzeVideo = analyzeVideoFlow;

interface SaveAnalysisParams {
    userId: string;
    videoFileName?: string;
    analysisData: AnalyzeVideoOutput;
    videoDescription: string;
}

/**
 * Saves the video analysis result to Firestore and increments the daily usage counter.
 */
export async function saveAnalysisToFirestore(params: SaveAnalysisParams): Promise<{ success: boolean; error?: string }> {
  const { userId, videoFileName, analysisData, videoDescription } = params;

  if (!userId || !analysisData) {
    return { success: false, error: 'Dados insuficientes para salvar a análise.' };
  }

  const { firestore } = initializeFirebaseAdmin();
  const analysisCollectionRef = firestore.collection(`users/${userId}/analisesVideo`);
  const todayStr = new Date().toISOString().split('T')[0];
  const usageDocRef = firestore.collection(`users/${userId}/dailyUsage`).doc(todayStr);

  try {
    // Use a transaction to ensure both writes succeed or fail together.
    await firestore.runTransaction(async (transaction) => {
      // 1. Add the new analysis document.
      const newAnalysisRef = analysisCollectionRef.doc();
      transaction.set(newAnalysisRef, {
        userId,
        videoFileName: videoFileName || "Nome do arquivo não disponível",
        analysisData,
        videoDescription: videoDescription,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 2. Read the daily usage document.
      const usageDoc = await transaction.get(usageDocRef);
      
      if (!usageDoc.exists) {
        // If it doesn't exist, create it with count 1.
        transaction.set(usageDocRef, {
            date: todayStr,
            videoAnalyses: 1,
            geracoesAI: 0
        });
      } else {
        // If it exists, increment the count.
        transaction.update(usageDocRef, {
          videoAnalyses: FieldValue.increment(1)
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in saveAnalysisToFirestore transaction:', error);
    return { success: false, error: error.message || 'Não foi possível salvar o resultado da análise no banco de dados.' };
  }
}
