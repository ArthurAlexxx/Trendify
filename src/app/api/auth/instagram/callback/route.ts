
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// --- Funções Auxiliares da Graph API ---

async function getAccessToken(code: string, redirectUri: string) {
    console.log('[getAccessToken] Obtendo token de acesso de curta duração...');
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
    console.log('[getAccessToken] Token de acesso de curta duração obtido com sucesso.');
    return data.access_token;
}

async function getLongLivedAccessToken(shortLivedToken: string) {
    console.log('[getLongLivedAccessToken] Trocando por token de longa duração...');
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
    console.log('[getLongLivedAccessToken] Token de longa duração obtido com sucesso.');
    return data.access_token;
}

async function getFacebookPages(userAccessToken: string) {
    console.log('[getFacebookPages] Buscando páginas do Facebook do usuário...');
    const url = `https://graph.facebook.com/me/accounts?fields=instagram_business_account{name,username},name,access_token&access_token=${userAccessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    // Log da resposta bruta da API para depuração
    console.log('[getFacebookPages] Resposta bruta da API /me/accounts:', JSON.stringify(data, null, 2));

    if (data.error) {
        throw new Error(`Erro ao buscar páginas: ${data.error.message}`);
    }
    
    // Agora, em vez de falhar silenciosamente, vamos lançar um erro informativo se data.data estiver vazio.
    if (!data.data || data.data.length === 0) {
        const errorMessage = `Nenhuma de suas Páginas do Facebook foi encontrada na resposta da API. Verifique se você concedeu permissão para 'Todas as Páginas' na tela de autorização do Facebook. Resposta recebida da Meta: ${JSON.stringify(data)}`;
        throw new Error(errorMessage);
    }
    
    console.log(`[getFacebookPages] Encontradas ${data.data.length} páginas. Procurando por uma com conta do Instagram Business...`);

    const pageWithIg = data.data.find((page: any) => page.instagram_business_account);
    if (!pageWithIg) {
        throw new Error("Nenhuma Página do Facebook com uma conta do Instagram Business vinculada foi encontrada. Verifique as permissões no seu painel da Meta.");
    }
    
    console.log(`[getFacebookPages] Página encontrada com Instagram vinculado. ID da Página: ${pageWithIg.id}`);
    return pageWithIg;
}


async function getInstagramMetrics(instagramId: string, accessToken: string) {
    console.log(`[getInstagramMetrics] Buscando métricas para a conta do Instagram ID: ${instagramId}...`);
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

    console.log(`[getInstagramMetrics] Métricas calculadas com sucesso:`, metrics);
    return metrics;
}


// --- Rota da API (GET) ---

export async function GET(req: NextRequest) {
    console.log('[API Callback] Nova requisição GET recebida.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateFromUrl = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);
    const cookieStore = cookies();
    const stateFromCookie = cookieStore.get('csrf_state')?.value;
    
    if (error) {
        console.warn(`[API Callback] Erro recebido da Meta: ${error} - ${errorDescription}`);
        settingsUrl.searchParams.set('error', error);
        if (errorDescription) settingsUrl.searchParams.set('error_description', errorDescription);
        return NextResponse.redirect(settingsUrl);
    }
    
    if (!code) {
        const errorMsg = 'Código de autorização não encontrado na URL.';
        console.error(`[API Callback] ERRO: ${errorMsg}`);
        settingsUrl.searchParams.set('error', 'authorization_code_missing');
        settingsUrl.searchParams.set('error_description', errorMsg);
        return NextResponse.redirect(settingsUrl);
    }

    if (!stateFromUrl || !stateFromCookie || stateFromUrl !== stateFromCookie) {
        const errorMsg = 'Falha na validação CSRF (state mismatch). A requisição não é confiável.';
        console.error(`[API Callback] ERRO: ${errorMsg}`);
        settingsUrl.searchParams.set('error', 'csrf_validation_failed');
        settingsUrl.searchParams.set('error_description', errorMsg);
        return NextResponse.redirect(settingsUrl);
    }
    
    const uid = JSON.parse(stateFromCookie).uid;
    console.log(`[API Callback] Validação de estado e CSRF bem-sucedida para o UID: ${uid}`);


    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const userAccessToken = await getAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(userAccessToken);
        
        const facebookPage = await getFacebookPages(longLivedToken);
        const instagramAccountId = facebookPage.instagram_business_account.id;
        
        const instagramData = await getInstagramMetrics(instagramAccountId, longLivedToken);

        const firestore = initializeFirebaseAdmin().firestore;
        const userRef = firestore.collection('users').doc(uid);

        await userRef.update({
            instagramAccessToken: longLivedToken,
            instagramHandle: instagramData.username,
            followers: instagramData.followers,
            averageViews: instagramData.averageViews,
            averageLikes: instagramData.averageLikes,
            averageComments: instagramData.averageComments,
        });

        console.log(`[API Callback] SUCESSO: Dados do Instagram para o UID ${uid} foram atualizados no Firestore.`);

        settingsUrl.searchParams.set('instagram_connected', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("[API Callback] Erro no fluxo de callback do Instagram Graph API:", e);
        settingsUrl.searchParams.set('error', e.message || 'Erro desconhecido durante a conexão com o Instagram.');
        return NextResponse.redirect(settingsUrl);
    }
}

    