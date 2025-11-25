import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';

async function exchangeCodeForToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        console.error("[exchangeCodeForToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }

    const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('code', code);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.error) {
        console.error("[exchangeCodeForToken] Erro da API do Facebook:", data.error);
        throw new Error(data.error.message || "Erro desconhecido ao obter token de acesso.");
    }
    return { accessToken: data.access_token };
}

async function getLongLivedAccessToken(shortLivedToken: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    
    const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId!);
    url.searchParams.set('client_secret', appSecret!);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.access_token;
}

async function getConnectedInstagramAccount(accessToken: string) {
    const pagesUrl = new URL('https://graph.facebook.com/v19.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'instagram_business_account'); // Pedir o campo aqui

    console.log('[getConnectedInstagramAccount] Buscando páginas do Facebook conectadas...');
    const pagesResponse = await fetch(pagesUrl.toString());
    const pagesData = await pagesResponse.json();

    if (pagesData.error) throw new Error(`Erro ao buscar páginas: ${pagesData.error.message}`);
    
    console.log('[getConnectedInstagramAccount] Resposta da API de Páginas:', JSON.stringify(pagesData, null, 2));

    if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error("Nenhuma página do Facebook encontrada. Você precisa conectar uma página que esteja vinculada à sua conta profissional do Instagram.");
    }
    
    // Encontra a primeira página que tem uma conta do Instagram vinculada
    const pageWithIg = pagesData.data.find((page: any) => page.instagram_business_account);
    
    if (!pageWithIg) {
        throw new Error("Nenhuma das suas Páginas do Facebook está conectada a uma conta empresarial do Instagram.");
    }

    console.log(`[getConnectedInstagramAccount] Encontrada conta do Instagram ID: ${pageWithIg.instagram_business_account.id}`);
    return pageWithIg.instagram_business_account.id;
}


async function getInstagramAccountInfo(igUserId: string, accessToken: string) {
    console.log(`[getInstagramAccountInfo] Buscando informações para o user_id: ${igUserId}`);
    const fields = 'id,username,followers_count,media_count,profile_picture_url,biography,account_type';
    const url = new URL(`https://graph.facebook.com/v19.0/${igUserId}`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
        console.error("[getInstagramAccountInfo] Erro ao buscar dados da conta do Instagram:", data.error);
        throw new Error(data.error?.message || "Falha ao buscar dados da conta do Instagram.");
    }

    if (data.account_type !== 'BUSINESS' && data.account_type !== 'MEDIA_CREATOR') {
        throw new Error(`A conta do Instagram '${data.username}' precisa ser do tipo 'Comercial' ou 'Criador de Conteúdo' para usar a integração.`);
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
        
        const { accessToken: shortLivedToken } = await exchangeCodeForToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(shortLivedToken);
        const igUserId = await getConnectedInstagramAccount(longLivedToken);
        const accountInfo = await getInstagramAccountInfo(igUserId, longLivedToken);

        const firestore = initializeFirebaseAdmin().firestore;
        const userRef = firestore.collection('users').doc(uid);
        
        const existingDoc = await userRef.get();
        const existingData = existingDoc.data();

        const formatFollowers = (num: number) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
            return num.toString();
        }

        await userRef.update({
            instagramAccessToken: longLivedToken,
            instagramUserId: accountInfo.id,
            instagramHandle: accountInfo.username,
            followers: accountInfo.followers_count ? formatFollowers(accountInfo.followers_count) : '0',
            bio: accountInfo.biography || existingData?.bio || null,
            photoURL: existingData?.photoURL || accountInfo.profile_picture_url || null, // Keep existing photoURL
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
