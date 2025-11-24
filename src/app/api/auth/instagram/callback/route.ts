
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Exchanges an authorization code for a short-lived user access token.
 */
async function getAccessToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        console.error("[getAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
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
        console.error("[getLongLivedAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
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
        console.error("[getFacebookPages] Erro ao listar páginas ou nenhuma página encontrada:", data);
        throw new Error("Nenhuma Página do Facebook foi encontrada. Certifique-se de que sua conta do Instagram esteja vinculada a uma Página do Facebook.");
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
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);

    if (error) {
        console.warn(`[API Callback] Erro recebido da Meta: ${error} - ${errorDescription}`);
        settingsUrl.searchParams.set('error', error);
        if (errorDescription) settingsUrl.searchParams.set('error_description', errorDescription);
        return NextResponse.redirect(settingsUrl);
    }
    
    // --- State and CSRF validation ---
    const cookieStore = cookies();
    const csrfFromCookie = cookieStore.get('instagram_auth_csrf')?.value;
    
    if (!state || !csrfFromCookie) {
        console.error('[API Callback] ERRO: Parâmetro state ou cookie CSRF ausente.');
        settingsUrl.searchParams.set('error', 'invalid_state');
        settingsUrl.searchParams.set('error_description', 'A sessão de autenticação é inválida ou expirou. Tente novamente.');
        return NextResponse.redirect(settingsUrl);
    }

    let parsedState: { uid: string; csrf: string };
    try {
        parsedState = JSON.parse(state);
    } catch (e) {
        console.error('[API Callback] ERRO: Falha ao parsear o parâmetro state.', e);
        settingsUrl.searchParams.set('error', 'invalid_state');
        settingsUrl.searchParams.set('error_description', 'O estado da sessão recebido é malformado.');
        return NextResponse.redirect(settingsUrl);
    }

    if (parsedState.csrf !== csrfFromCookie) {
        console.error('[API Callback] ERRO: Discrepância de CSRF. Possível ataque.');
        settingsUrl.searchParams.set('error', 'csrf_mismatch');
        settingsUrl.searchParams.set('error_description', 'A validação de segurança falhou. Tente novamente.');
        return NextResponse.redirect(settingsUrl);
    }
    
    // Clear the CSRF cookie once it's used
    cookieStore.delete('instagram_auth_csrf');
    
    const { uid } = parsedState;
    if (!uid) {
        console.error('[API Callback] ERRO: UID do usuário não encontrado no state.');
        settingsUrl.searchParams.set('error', 'no_uid');
        settingsUrl.searchParams.set('error_description', 'Não foi possível identificar o usuário. Tente novamente.');
        return NextResponse.redirect(settingsUrl);
    }

    console.log(`[API Callback] Validação de estado e CSRF bem-sucedida para o UID: ${uid}`);


    if (!code) {
        console.error('[API Callback] ERRO: Código de autorização não encontrado na URL.');
        settingsUrl.searchParams.set('error', 'authorization_code_missing');
        settingsUrl.searchParams.set('error_description', 'Código de autorização não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }
    

    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const userAccessToken = await getAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(userAccessToken);
        
        const pages = await getFacebookPages(longLivedToken);
        // We assume the user wants to use the first page connected to their IG account.
        const firstPageId = pages[0].id; 

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
        settingsUrl.searchParams.set('error', 'graph_api_error');
        settingsUrl.searchParams.set('error_description', e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}
