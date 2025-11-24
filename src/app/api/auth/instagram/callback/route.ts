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
        console.error("[getAccessToken] ERRO: Credenciais do aplicativo Meta (META_APP_ID ou META_APP_SECRET) não configuradas no servidor.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }
    
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    console.log('[getAccessToken] Solicitando token de acesso da Meta...');
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
        console.error("[getAccessToken] Erro ao obter token de acesso:", data.error);
        throw new Error(data.error?.message || "Falha ao obter o token de acesso.");
    }

    console.log('[getAccessToken] Token de acesso de curta duração obtido com sucesso.');
    return data.access_token;
}

/**
 * Exchanges a short-lived token for a long-lived one.
 */
async function getLongLivedAccessToken(shortLivedToken: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
     if (!appId || !appSecret) {
        console.error("[getLongLivedAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas no servidor.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }

    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    
    console.log('[getLongLivedAccessToken] Solicitando token de longa duração...');
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
        console.error("[getLongLivedAccessToken] Erro ao obter token de longa duração:", data.error);
        throw new Error(data.error?.message || 'Falha ao obter token de longa duração.');
    }
    console.log('[getLongLivedAccessToken] Token de longa duração obtido com sucesso.');
    return data.access_token;
}


/**
 * Fetches the user's Facebook Pages.
 */
async function getFacebookPages(userAccessToken: string) {
    const url = `https://graph.facebook.com/me/accounts?access_token=${userAccessToken}`;
    console.log('[getFacebookPages] Buscando páginas do Facebook do usuário...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || !data.data || data.data.length === 0) {
        console.error("[getFacebookPages] Erro ao listar páginas do Facebook ou nenhuma página encontrada:", data);
        throw new Error("Nenhuma Página do Facebook foi encontrada. Por favor, conecte uma página à sua conta do Instagram.");
    }
    
    console.log(`[getFacebookPages] Encontradas ${data.data.length} páginas.`);
    return data.data; // Returns an array of pages
}

/**
 * Fetches the Instagram Business Account ID from a Facebook Page.
 */
async function getInstagramAccountId(pageId: string, userAccessToken: string) {
    const url = `https://graph.facebook.com/${pageId}?fields=instagram_business_account&access_token=${userAccessToken}`;
    console.log(`[getInstagramAccountId] Buscando conta do Instagram para a página ${pageId}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.instagram_business_account) {
        console.error("[getInstagramAccountId] Erro ao obter a conta business do Instagram:", data);
        throw new Error("Não foi possível encontrar uma conta do Instagram Business vinculada a esta Página do Facebook.");
    }

    console.log(`[getInstagramAccountId] ID da conta do Instagram encontrado: ${data.instagram_business_account.id}`);
    return data.instagram_business_account.id;
}


/**
 * Fetches Instagram user data (followers_count, username) using the Instagram Business Account ID.
 */
async function getInstagramUserData(instagramId: string, userAccessToken: string) {
    const url = `https://graph.facebook.com/${instagramId}?fields=followers_count,username&access_token=${userAccessToken}`;
    console.log(`[getInstagramUserData] Buscando dados para a conta do Instagram ${instagramId}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        console.error("[getInstagramUserData] Erro ao buscar dados do usuário do Instagram:", data);
        throw new Error(data.error?.message || "Falha ao buscar dados do usuário do Instagram.");
    }

    console.log(`[getInstagramUserData] Dados do usuário encontrados: @${data.username}, ${data.followers_count} seguidores.`);
    return {
        followers: data.followers_count?.toString() || '0',
        username: data.username || '',
    };
}


export async function GET(req: NextRequest) {
    console.log('[API Callback] Nova requisição GET recebida.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);

    if (error) {
        console.warn(`[API Callback] Erro recebido da Meta: ${error}`);
        settingsUrl.searchParams.set('error', error);
        return NextResponse.redirect(settingsUrl);
    }

    if (!code) {
        console.error('[API Callback] ERRO: Código de autorização não encontrado na URL.');
        settingsUrl.searchParams.set('error', 'Código de autorização não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }
    
    let uid: string;
    try {
        console.log('[API Callback] Verificando cookie de sessão do Firebase...');
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (!sessionCookie) {
            throw new Error('Sessão de usuário não encontrada. Faça login novamente.');
        }

        const adminApp = initializeFirebaseAdmin();
        const decodedToken = await getAuth(adminApp.app).verifySessionCookie(sessionCookie);
        uid = decodedToken.uid;
        console.log(`[API Callback] Cookie de sessão verificado com sucesso para o UID: ${uid}`);
    } catch (e: any) {
        console.error("[API Callback] Erro ao verificar o cookie de sessão:", e);
        const errorMessage = e.message || 'Sessão inválida. Faça login novamente.';
        settingsUrl.searchParams.set('error', errorMessage);
        return NextResponse.redirect(settingsUrl);
    }

    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const userAccessToken = await getAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(userAccessToken);
        
        const pages = await getFacebookPages(longLivedToken);
        const firstPageId = pages[0].id; // Use the first page found

        const instagramAccountId = await getInstagramAccountId(firstPageId, longLivedToken);
        
        const instagramData = await getInstagramUserData(instagramAccountId, longLivedToken);

        const { firestore } = initializeFirebaseAdmin();
        const userRef = firestore.collection('users').doc(uid);
        
        console.log(`[API Callback] Atualizando o perfil do usuário ${uid} no Firestore...`);
        await userRef.update({
            instagramAccessToken: longLivedToken, 
            instagramHandle: `@${instagramData.username}`,
            followers: instagramData.followers,
        });

        console.log('[API Callback] Perfil do usuário atualizado com sucesso. Redirecionando para /settings com sucesso.');
        settingsUrl.searchParams.set('success', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("[API Callback] Erro no fluxo de callback do Instagram Graph API:", e);
        settingsUrl.searchParams.set('error', e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}
