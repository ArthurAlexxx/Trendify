
import { NextRequest, NextResponse } from 'next/server';

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
    console.log('[getFacebookPages] Buscando páginas do Facebook...');
    const url = `https://graph.facebook.com/me/accounts?fields=instagram_business_account{name,username},name,access_token&access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('[getFacebookPages] Resposta da API /me/accounts:', JSON.stringify(data, null, 2));

    if (data.error) {
        throw new Error(`Erro ao buscar páginas: ${data.error.message}`);
    }
    
    if (!data.data || data.data.length === 0) {
        throw new Error("Nenhuma de suas Páginas do Facebook foi encontrada. Verifique se você concedeu permissão para 'Todas as Páginas' na tela de autorização do Facebook.");
    }

    const pageWithIg = data.data.find((page: any) => page.instagram_business_account);
    if (!pageWithIg) {
        throw new Error("Nenhuma Página do Facebook com uma conta do Instagram Business vinculada foi encontrada. Verifique as permissões no seu painel da Meta.");
    }
    
    console.log(`[getFacebookPages] Encontrada página com Instagram vinculado. ID da Página: ${pageWithIg.id}`);
    return [pageWithIg];
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
    const fields = 'username,followers_count,media.limit(25){like_count,comments_count,media_type,insights.metric(reach)}';
    const url = `https://graph.facebook.com/${instagramId}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        console.error("[getInstagramMetrics] Erro ao buscar dados do usuário do Instagram:", data.error);
        throw new Error(data.error?.message || "Falha ao buscar dados do usuário do Instagram. A permissão de 'insights' pode estar faltando.");
    }
    
    let totalLikes = 0;
    let totalComments = 0;
    let totalReach = 0;
    let mediaCount = 0;

    if (data.media && data.media.data) {
        for (const item of data.media.data) {
            totalLikes += item.like_count || 0;
            totalComments += item.comments_count || 0;
            if (item.insights && item.insights.data && item.insights.data[0]) {
                 totalReach += item.insights.data[0].values[0].value || 0;
            }
            mediaCount++;
        }
    } else {
        console.warn(`[getInstagramMetrics] Nenhum post (mídia) encontrado para a conta ${instagramId} para calcular as médias.`);
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
    
    // Check if it's the test mode from our isolated test
    const isTestMode = state?.startsWith('test-mode-');

    if (error) {
        console.warn(`[API Callback] Erro recebido da Meta: ${error} - ${errorDescription}`);
        const param = isTestMode ? 'test_error' : 'error';
        settingsUrl.searchParams.set(isTestMode ? 'test_success' : 'success', 'false');
        settingsUrl.searchParams.set(param, error);
        if (errorDescription) settingsUrl.searchParams.set(isTestMode ? 'test_error_description' : 'error_description', errorDescription);
        return NextResponse.redirect(settingsUrl);
    }
    
    if (!code) {
        const errorMsg = 'Código de autorização não encontrado na URL.';
        console.error(`[API Callback] ERRO: ${errorMsg}`);
        settingsUrl.searchParams.set(isTestMode ? 'test_success' : 'success', 'false');
        settingsUrl.searchParams.set(isTestMode ? 'test_error' : 'error', 'authorization_code_missing');
        settingsUrl.searchParams.set(isTestMode ? 'test_error_description' : 'error_description', errorMsg);
        return NextResponse.redirect(settingsUrl);
    }

    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const userAccessToken = await getAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(userAccessToken);
        
        const pages = await getFacebookPages(longLivedToken);
        const firstPage = pages[0]; 
        const instagramAccountId = firstPage.instagram_business_account.id;
        
        const instagramData = await getInstagramMetrics(instagramAccountId, longLivedToken);

        const resultData = {
            longLivedToken,
            pageId: firstPage.id,
            instagramAccountId,
            ...instagramData
        };

        // If in test mode, just redirect with the data
        if (isTestMode) {
             console.log('[API Callback] Teste bem-sucedido. Redirecionando com dados:', resultData);
             settingsUrl.searchParams.set('test_success', 'true');
             settingsUrl.searchParams.set('test_data', encodeURIComponent(JSON.stringify(resultData)));
             return NextResponse.redirect(settingsUrl);
        }

        // The rest of the logic can be re-enabled later by removing the test mode logic.
        // For now, we stop here for the test.
        console.error('[API Callback] ERRO: Fluxo de produção não implementado neste modo de teste.');
        settingsUrl.searchParams.set('error', 'production_flow_disabled');
        settingsUrl.searchParams.set('error_description', 'O fluxo de salvamento de dados está desativado para teste.');
        return NextResponse.redirect(settingsUrl);


    } catch (e: any) {
        console.error("[API Callback] Erro no fluxo de callback do Instagram Graph API:", e);
        const param = isTestMode ? 'test_error' : 'error';
        settingsUrl.searchParams.set(isTestMode ? 'test_success' : 'success', 'false');
        settingsUrl.searchParams.set(param, e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}

    