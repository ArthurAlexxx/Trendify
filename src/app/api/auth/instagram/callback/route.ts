
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

/**
 * Exchanges an authorization code for a short-lived user access token.
 */
async function getAccessToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }
    
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
        console.error("Erro ao obter token de acesso:", data.error);
        throw new Error(data.error?.message || "Falha ao obter o token de acesso.");
    }

    return data.access_token;
}

/**
 * Fetches the user's Facebook Pages.
 */
async function getFacebookPages(userAccessToken: string) {
    const url = `https://graph.facebook.com/me/accounts?access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || !data.data || data.data.length === 0) {
        console.error("Erro ao listar páginas do Facebook ou nenhuma página encontrada:", data);
        throw new Error("Nenhuma Página do Facebook foi encontrada. Por favor, conecte uma página à sua conta do Instagram.");
    }
    
    return data.data; // Returns an array of pages
}

/**
 * Fetches the Instagram Business Account ID from a Facebook Page.
 */
async function getInstagramAccountId(pageId: string, userAccessToken: string) {
    const url = `https://graph.facebook.com/${pageId}?fields=instagram_business_account&access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.instagram_business_account) {
        console.error("Erro ao obter a conta business do Instagram:", data);
        throw new Error("Não foi possível encontrar uma conta do Instagram Business vinculada a esta Página do Facebook.");
    }

    return data.instagram_business_account.id;
}


/**
 * Fetches Instagram user data (followers_count, username) using the Instagram Business Account ID.
 */
async function getInstagramUserData(instagramId: string, userAccessToken: string) {
    const url = `https://graph.facebook.com/${instagramId}?fields=followers_count,username&access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        console.error("Erro ao buscar dados do usuário do Instagram:", data);
        throw new Error(data.error?.message || "Falha ao buscar dados do usuário do Instagram.");
    }

    return {
        followers: data.followers_count?.toString() || '0',
        username: data.username || '',
    };
}


export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchPojos.get('error');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);

    if (error) {
        settingsUrl.searchParams.set('error', error);
        return NextResponse.redirect(settingsUrl);
    }

    if (!code) {
        settingsUrl.searchParams.set('error', 'Código de autorização não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }
    
    let uid: string;
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (!sessionCookie) {
            throw new Error('Sessão de usuário não encontrada. Faça login novamente.');
        }

        const adminApp = initializeFirebaseAdmin();
        const decodedToken = await getAuth(adminApp.app).verifySessionCookie(sessionCookie);
        uid = decodedToken.uid;
    } catch (e: any) {
        console.error("Erro ao verificar o cookie de sessão:", e);
        const errorMessage = e.message || 'Sessão inválida. Faça login novamente.';
        settingsUrl.searchParams.set('error', errorMessage);
        return NextResponse.redirect(settingsUrl);
    }

    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const userAccessToken = await getAccessToken(code, redirectUri);
        
        const pages = await getFacebookPages(userAccessToken);
        const firstPageId = pages[0].id; // Use the first page found

        const instagramAccountId = await getInstagramAccountId(firstPageId, userAccessToken);
        
        const instagramData = await getInstagramUserData(instagramAccountId, userAccessToken);

        const { firestore } = initializeFirebaseAdmin();
        const userRef = firestore.collection('users').doc(uid);
        
        await userRef.update({
            // Note: This is a short-lived token. For production, you'd exchange it for a long-lived one.
            instagramAccessToken: userAccessToken, 
            instagramHandle: instagramData.username,
            followers: instagramData.followers,
        });

        settingsUrl.searchParams.set('success', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("Erro no fluxo de callback do Instagram Graph API:", e);
        settingsUrl.searchParams.set('error', e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}
