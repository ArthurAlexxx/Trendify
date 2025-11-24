
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';
import crypto from 'crypto';


// --- Funções Auxiliares da Graph API ---

async function getAccessToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        console.error("[getAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    console.log('[getAccessToken] Token de acesso de curta duração obtido.');
    return data.access_token;
}

async function getLongLivedAccessToken(shortLivedToken: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        console.error("[getLongLivedAccessToken] ERRO: Credenciais do aplicativo Meta não configuradas.");
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    console.log('[getLongLivedAccessToken] Token de longa duração obtido.');
    return data.access_token;
}

async function getFacebookPages(userAccessToken: string) {
    const url = `https://graph.facebook.com/me/accounts?access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.data || data.data.length === 0) {
        throw new Error("Nenhuma Página do Facebook foi encontrada. Certifique-se de que sua conta do Instagram esteja vinculada a uma Página do Facebook.");
    }
    console.log(`[getFacebookPages] Encontradas ${data.data.length} páginas.`);
    return data.data;
}

async function getInstagramAccountId(pageId: string, userAccessToken: string) {
    const url = `https://graph.facebook.com/${pageId}?fields=instagram_business_account&access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.instagram_business_account) {
        throw new Error("Não foi possível encontrar uma conta do Instagram Business vinculada a esta Página do Facebook.");
    }
    console.log(`[getInstagramAccountId] ID da conta do Instagram encontrado: ${data.instagram_business_account.id}`);
    return data.instagram_business_account.id;
}

async function getInstagramMetrics(instagramId: string, accessToken: string) {
    console.log(`[getInstagramMetrics] Buscando métricas para a conta do Instagram ${instagramId}...`);
    const fields = 'username,followers_count,media{like_count,comments_count,media_type,insights.metric(reach)}';
    const url = `https://graph.facebook.com/${instagramId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        console.error("[getInstagramMetrics] Erro ao buscar dados do usuário do Instagram:", data);
        throw new Error(data.error?.message || "Falha ao buscar dados do usuário do Instagram.");
    }
    
    let totalLikes = 0;
    let totalComments = 0;
    let totalReach = 0;
    let mediaCount = 0;

    if (data.media && data.media.data) {
        for (const item of data.media.data) {
            // Consider only recent posts for a more accurate average, e.g., first 25 (default limit)
            totalLikes += item.like_count || 0;
            totalComments += item.comments_count || 0;
            if (item.insights && item.insights.data && item.insights.data[0]) {
                 totalReach += item.insights.data[0].values[0].value || 0;
            }
            mediaCount++;
        }
    }
    
    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace('.', ',') + 'K';
        }
        return num.toString();
    }

    const avgLikes = mediaCount > 0 ? formatNumber(Math.round(totalLikes / mediaCount)) : '0';
    const avgComments = mediaCount > 0 ? formatNumber(Math.round(totalComments / mediaCount)) : '0';
    const avgViews = mediaCount > 0 ? formatNumber(Math.round(totalReach / mediaCount)) : '0';

    const metrics = {
        followers: data.followers_count ? formatNumber(data.followers_count) : '0',
        username: data.username || '',
        averageLikes: avgLikes,
        averageComments: avgComments,
        averageViews: avgViews,
    };

    console.log(`[getInstagramMetrics] Métricas calculadas:`, metrics);
    return metrics;
}


// --- Rota da API (GET) ---

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
        const firstPageId = pages[0].id; 
        const instagramAccountId = await getInstagramAccountId(firstPageId, longLivedToken);
        
        const instagramData = await getInstagramMetrics(instagramAccountId, longLivedToken);

        const { firestore } = initializeFirebaseAdmin();
        const userRef = firestore.collection('users').doc(uid);
        
        const updatePayload = {
            instagramAccessToken: longLivedToken, 
            instagramHandle: `@${instagramData.username}`,
            followers: instagramData.followers,
            averageLikes: instagramData.averageLikes,
            averageComments: instagramData.averageComments,
            averageViews: instagramData.averageViews,
        };
        console.log(`[API Callback] Atualizando o perfil do usuário ${uid} no Firestore com:`, updatePayload);
        await userRef.update(updatePayload);

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

    