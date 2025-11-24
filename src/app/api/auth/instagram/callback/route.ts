
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

/**
 * Exchanges a short-lived Instagram code for a short-lived access token.
 */
async function getShortLivedAccessToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error("Credenciais do aplicativo Meta não configuradas no servidor.");
    }
    
    const body = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Erro ao obter token de acesso de curta duração:", data);
        throw new Error(data.error_message || "Falha ao obter o token de acesso de curta duração.");
    }

    return data.access_token;
}

/**
 * Exchanges a short-lived access token for a long-lived access token.
 */
async function getLongLivedAccessToken(shortLivedToken: string) {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
        throw new Error("Chave secreta do aplicativo Meta não configurada no servidor.");
    }
    
    const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        console.error("Erro ao obter token de acesso de longa duração:", data);
        throw new Error(data.error_message || "Falha ao obter o token de acesso de longa duração.");
    }

    return data.access_token;
}


export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);

    if (error) {
        settingsUrl.searchParams.set('error', error);
        return NextResponse.redirect(settingsUrl);
    }

    if (!code) {
        settingsUrl.searchParams.set('error', 'Código de autorização não encontrado.');
        return NextResponse.redirect(settingsUrl);
    }
    
    // Check for Firebase session cookie to get the UID
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        settingsUrl.searchParams.set('error', 'Sessão de usuário não encontrada. Faça login novamente.');
        return NextResponse.redirect(settingsUrl);
    }

    let uid: string;
    try {
        const adminApp = initializeFirebaseAdmin();
        const decodedToken = await getAuth(adminApp.app).verifySessionCookie(sessionCookie);
        uid = decodedToken.uid;
    } catch (e) {
        console.error("Erro ao verificar o cookie de sessão:", e);
        settingsUrl.searchParams.set('error', 'Sessão inválida. Faça login novamente.');
        return NextResponse.redirect(settingsUrl);
    }


    try {
        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        const shortLivedToken = await getShortLivedAccessToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(shortLivedToken);

        const { firestore } = initializeFirebaseAdmin();
        const userRef = firestore.collection('users').doc(uid);
        
        await userRef.update({
            instagramAccessToken: longLivedToken,
        });

        settingsUrl.searchParams.set('success', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("Erro no fluxo de callback do Instagram:", e);
        settingsUrl.searchParams.set('error', e.message || 'Erro desconhecido');
        return NextResponse.redirect(settingsUrl);
    }
}
