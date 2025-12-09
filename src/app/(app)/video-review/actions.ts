
'use server';

import { analyzeVideo as analyzeVideoFlow, type AnalyzeVideoOutput } from '@/ai/flows/analyze-video-flow';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Re-export the analyzeVideo function to be used as a Server Action.
 */
export const analyzeVideo = analyzeVideoFlow;

/**
 * Saves the video analysis result to Firestore.
 * @param userId - The ID of the user.
 * @param videoUrl - The public URL of the video in Firebase Storage.
 * @param videoFileName - The original name of the video file.
 * @param dataToSave - An object containing the analysisData and videoDescription.
 */
export async function saveAnalysisToFirestore(
  userId: string,
  videoUrl: string,
  videoFileName: string,
  dataToSave: {
    analysisData: AnalyzeVideoOutput,
    videoDescription: string
  }
) {
  if (!userId || !videoUrl || !videoFileName || !dataToSave.analysisData) {
    throw new Error('Dados insuficientes para salvar a análise.');
  }

  const { firestore } = initializeFirebaseAdmin();
  const analysisCollectionRef = firestore.collection(`users/${userId}/analisesVideo`);

  try {
    await analysisCollectionRef.add({
      userId,
      videoUrl,
      videoFileName,
      analysisData: { ...dataToSave.analysisData, videoDescription: dataToSave.videoDescription }, // Include description
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving analysis to Firestore:', error);
    throw new Error('Não foi possível salvar o resultado da análise no banco de dados.');
  }
}
