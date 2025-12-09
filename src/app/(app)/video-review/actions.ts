
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
 * Saves the video analysis result to Firestore.
 */
export async function saveAnalysisToFirestore(params: SaveAnalysisParams): Promise<{ success: boolean; error?: string }> {
  const { userId, videoFileName, analysisData, videoDescription } = params;

  if (!userId || !analysisData) {
    return { success: false, error: 'Dados insuficientes para salvar a análise.' };
  }

  const { firestore } = initializeFirebaseAdmin();
  const analysisCollectionRef = firestore.collection(`users/${userId}/analisesVideo`);

  try {
    await analysisCollectionRef.add({
      userId,
      videoFileName: videoFileName || "Nome do arquivo não disponível",
      analysisData,
      videoDescription: videoDescription,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving analysis to Firestore:', error);
    return { success: false, error: error.message || 'Não foi possível salvar o resultado da análise no banco de dados.' };
  }
}
