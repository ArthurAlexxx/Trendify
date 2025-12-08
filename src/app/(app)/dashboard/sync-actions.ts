
'use server';

import { doc, writeBatch, collection, getDocs, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getInstagramPosts, getInstagramProfile, getTikTokPosts, getTikTokProfile } from '../profile/actions';
import { initializeFirebaseAdmin } from '@/firebase/admin';

interface SyncResult {
    success: boolean;
    error?: string;
    message?: string;
}

const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 10000) return `${(num / 1000).toFixed(1).replace('.', ',')}K`;
    if (num >= 1000) return num.toLocaleString('pt-BR');
    return String(num);
};

const updateOrCreateMetricSnapshot = async (firestore: FirebaseFirestore.Firestore, userId: string, platform: 'instagram' | 'tiktok', data: any) => {
    const todayDateString = new Date().toISOString().split('T')[0];
    const snapshotDocRef = doc(firestore, `users/${userId}/metricSnapshots`, `${platform}_${todayDateString}`);
  
    const snapshotData = {
      date: serverTimestamp(),
      platform,
      followers: data.followers || '0',
      views: data.views || '0',
      likes: data.likes || '0',
      comments: data.comments || '0',
    };
  
    await setDoc(snapshotDocRef, snapshotData, { merge: true });
};


export async function syncInstagramAction(userId: string, username: string): Promise<SyncResult> {
    if (!userId || !username) {
        return { success: false, error: "ID do usuário ou nome de usuário do Instagram ausente." };
    }
    
    const cleanedUsername = username.replace('@', '');

    try {
        const { firestore } = initializeFirebaseAdmin();
        const userProfileRef = doc(firestore, `users/${userId}`);

        const [profileResult, postsResult] = await Promise.all([
            getInstagramProfile(cleanedUsername),
            getInstagramPosts(cleanedUsername)
        ]);

        const videoPosts = postsResult.filter(p => p.is_video && p.video_view_count);
        const averageViews = videoPosts.length > 0 ? videoPosts.reduce((acc, p) => acc + (p.video_view_count ?? 0), 0) / videoPosts.length : 0;
        const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
        const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;

        const batch = writeBatch(firestore);

        const dataToSave = {
            instagramHandle: `@${profileResult.username}`,
            instagramFollowers: formatNumber(profileResult.followersCount),
            instagramAverageViews: formatNumber(Math.round(averageViews)),
            instagramAverageLikes: formatNumber(Math.round(averageLikes)),
            instagramAverageComments: formatNumber(Math.round(averageComments)),
            lastInstagramSync: serverTimestamp(),
        };
        batch.update(userProfileRef, dataToSave);

        const postsCollectionRef = collection(firestore, `users/${userId}/instagramPosts`);
        const oldPostsSnap = await getDocs(postsCollectionRef);
        oldPostsSnap.forEach(doc => batch.delete(doc.ref));
        
        postsResult.forEach(post => {
            const postRef = doc(postsCollectionRef, post.id);
            batch.set(postRef, { ...post, fetchedAt: serverTimestamp() });
        });
        
        await batch.commit();

        await updateOrCreateMetricSnapshot(firestore, userId, 'instagram', {
            followers: dataToSave.instagramFollowers,
            views: dataToSave.instagramAverageViews,
            likes: dataToSave.instagramAverageLikes,
            comments: dataToSave.instagramAverageComments,
        });

        return { success: true, message: 'Dados do Instagram sincronizados com sucesso!' };

    } catch (e: any) {
        console.error("[syncInstagramAction] Error:", e);
        return { success: false, error: e.message || "Um erro desconhecido ocorreu ao sincronizar o Instagram." };
    }
}


export async function syncTikTokAction(userId: string, username: string): Promise<SyncResult> {
     if (!userId || !username) {
        return { success: false, error: "ID do usuário ou nome de usuário do TikTok ausente." };
    }

    const cleanedUsername = username.replace('@', '');

    try {
        const { firestore } = initializeFirebaseAdmin();
        const userProfileRef = doc(firestore, `users/${userId}`);

        const [profileResult, postsResult] = await Promise.all([
            getTikTokProfile(cleanedUsername),
            getTikTokPosts(cleanedUsername),
        ]);
        
        const averageLikes = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.likes, 0) / postsResult.length : 0;
        const averageComments = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.comments, 0) / postsResult.length : 0;
        const averageViews = postsResult.length > 0 ? postsResult.reduce((acc, p) => acc + p.views, 0) / postsResult.length : 0;

        const batch = writeBatch(firestore);

        const dataToSave = {
            tiktokHandle: `@${profileResult.username}`,
            tiktokFollowers: formatNumber(profileResult.followersCount),
            tiktokAverageLikes: formatNumber(Math.round(averageLikes)),
            tiktokAverageComments: formatNumber(Math.round(averageComments)),
            tiktokAverageViews: formatNumber(Math.round(averageViews)),
            lastTikTokSync: serverTimestamp(),
        };
        batch.update(userProfileRef, dataToSave);

        const postsCollectionRef = collection(firestore, `users/${userId}/tiktokPosts`);
        const oldPostsSnap = await getDocs(postsCollectionRef);
        oldPostsSnap.forEach(doc => batch.delete(doc.ref));

        postsResult.forEach(post => {
            const postRef = doc(postsCollectionRef, post.id);
            const dataWithTimestamp = {
                ...post,
                createdAt: post.createdAt ? Timestamp.fromDate(post.createdAt as any) : null,
                fetchedAt: serverTimestamp()
            };
            batch.set(postRef, dataWithTimestamp);
        });

        await batch.commit();

        await updateOrCreateMetricSnapshot(firestore, userId, 'tiktok', {
            followers: dataToSave.tiktokFollowers,
            views: dataToSave.tiktokAverageViews,
            likes: dataToSave.tiktokAverageLikes,
            comments: dataToSave.tiktokAverageComments,
        });

        return { success: true, message: 'Dados do TikTok sincronizados com sucesso!' };

    } catch (e: any) {
        console.error("[syncTikTokAction] Error:", e);
        return { success: false, error: e.message || "Um erro desconhecido ocorreu ao sincronizar o TikTok." };
    }
}
