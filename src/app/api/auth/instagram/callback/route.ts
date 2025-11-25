
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';

// --- Funções Auxiliares da Nova API ---

async function getInstagramAccessToken(code: string, redirectUri: string) {
    console.log('[getInstagramAccessToken] Trocando código por token de acesso...');
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        console.error("[getInstagramAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }

    const url = 'https://api.instagram.com/oauth/access_token';
    const body = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = await response.json();
    if (data.error_message) {
        console.error("[getInstagramAccessToken] Erro da API do Instagram:", data);
        throw new Error(data.error_message);
    }

    console.log('[getInstagramAccessToken] Token de acesso e user_id obtidos com sucesso.');
    return { accessToken: data.access_token, userId: data.user_id };
}

async function getLongLivedInstagramToken(shortLivedToken: string) {
    console.log('[getLongLivedInstagramToken] Trocando por token de longa duração...');
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
        throw new Error("Client Secret do app não configurado.");
    }
    const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    console.log('[getLongLivedInstagramToken] Token de longa duração obtido.');
    return data.access_token;
}

async function getInstagramAccountInfo(userId: string, accessToken: string) {
    console.log(`[getInstagramAccountInfo] Buscando informações para o user_id: ${userId}`);
    const fields = 'id,username,account_type,followers_count,media_count';
    const url = `https://graph.instagram.com/v19.0/${userId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        console.error("[getInstagramAccountInfo] Erro ao buscar dados da conta do Instagram:", data.error);
        throw new Error(data.error?.message || "Falha ao buscar dados da conta do Instagram.");
    }
    
    if (data.account_type !== 'BUSINESS' && data.account_type !== 'CREATOR') {
        throw new Error(`A conta do Instagram (@${data.username}) precisa ser do tipo "Comercial" ou "Criador de Conteúdo" para usar a integração.`);
    }
    
    console.log(`[getInstagramAccountInfo] Informações da conta obtidas:`, data);
    return data;
}

// --- Rota da API (GET) ---

export async function GET(req: NextRequest) {
    console.log('[API Callback] Nova requisição GET recebida.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateFromUrlStr = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);
    const cookieStore = cookies();
    const stateFromCookieStr = cookieStore.get('csrf_state')?.value;
    
    if (error) {
        console.warn(`[API Callback] Erro recebido do Instagram: ${error} - ${errorDescription}`);
        settingsUrl.searchParams.set('error', error);
        if (errorDescription) settingsUrl.searchParams.set('error_description', errorDescription);
        return NextResponse.redirect(settingsUrl);
    }
    
    if (!code) {
        console.error(`[API Callback] ERRO: Código de autorização não encontrado na URL.`);
        settingsUrl.searchParams.set('error', 'authorization_code_missing');
        settingsUrl.searchParams.set('error_description', 'Código de autorização não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }

     if (!stateFromUrlStr || !stateFromCookieStr) {
        console.error('[API Callback] ERRO: State da URL ou do cookie não encontrado.');
        settingsUrl.searchParams.set('error', 'state_missing');
        settingsUrl.searchParams.set('error_description', 'Parâmetro state de validação não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }

    try {
        const stateFromUrl = JSON.parse(stateFromUrlStr);
        const stateFromCookie = JSON.parse(stateFromCookieStr);

        if (stateFromUrl.csrf !== stateFromCookie.csrf) {
            const errorMsg = 'Falha na validação CSRF (state mismatch). A requisição não é confiável.';
            console.error(`[API Callback] ERRO: ${errorMsg}`);
            settingsUrl.searchParams.set('error', 'csrf_validation_failed');
            settingsUrl.searchParams.set('error_description', errorMsg);
            return NextResponse.redirect(settingsUrl);
        }
        
        const uid = stateFromCookie.uid;
        console.log(`[API Callback] Validação de estado e CSRF bem-sucedida para o UID: ${uid}`);
        cookieStore.delete('csrf_state');

        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const { accessToken: shortLivedToken, userId } = await getInstagramAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedInstagramToken(shortLivedToken);
        const accountInfo = await getInstagramAccountInfo(userId, longLivedToken);

        const firestore = initializeFirebaseAdmin().firestore;
        const userRef = firestore.collection('users').doc(uid);

        const formatFollowers = (num: number) => {
            if (num >= 1000) return (num / 1000).toFixed(1).replace('.', ',') + 'K';
            return num.toString();
        }

        await userRef.update({
            instagramAccessToken: longLivedToken,
            instagramUserId: accountInfo.id,
            instagramHandle: accountInfo.username,
            followers: accountInfo.followers_count ? formatFollowers(accountInfo.followers_count) : '0',
            // Limpa dados antigos da API do Facebook para evitar confusão
            averageViews: null,
            averageLikes: null,
            averageComments: null,
        });

        console.log(`[API Callback] SUCESSO: Dados do Instagram para o UID ${uid} foram atualizados no Firestore.`);
        settingsUrl.searchParams.set('instagram_connected', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("[API Callback] Erro no fluxo de callback do Instagram:", e);
        settingsUrl.searchParams.set('error', 'instagram_flow_failed');
        settingsUrl.searchParams.set('error_description', e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}

    