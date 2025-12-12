
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { cookies } from 'next/headers';

async function exchangeCodeForToken(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        console.error("[exchangeCodeForToken] ERROR: Meta App credentials not configured.");
        throw new Error("Server configuration error: Meta App credentials missing.");
    }

    const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('code', code);
    
    console.log(`[exchangeCodeForToken] Requesting short-lived token.`);
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
        console.error("[exchangeCodeForToken] Facebook API error during code exchange:", data.error);
        throw new Error(data.error.message || "Failed to get access token.");
    }
    console.log("[exchangeCodeForToken] Short-lived token obtained successfully.");
    return { accessToken: data.access_token };
}

async function getLongLivedAccessToken(shortLivedToken: string): Promise<string> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        console.error("[getLongLivedAccessToken] ERROR: Meta App credentials not configured.");
        throw new Error("Server configuration error: Meta App credentials missing.");
    }

    const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    console.log(`[getLongLivedAccessToken] Requesting long-lived token.`);
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
        console.error("[getLongLivedAccessToken] Facebook API error getting long-lived token:", data.error);
        throw new Error(data.error.message || "Failed to get long-lived token.");
    }
    console.log("[getLongLivedAccessToken] Long-lived token obtained successfully.");
    return data.access_token;
}

async function getInstagramAccountInfo(accessToken: string) {
    console.log(`[getInstagramAccountInfo] Fetching Instagram account info.`);
    
    const fields = 'id,username,account_type,followers_count,media_count,profile_picture_url,biography';
    const url = new URL(`https://graph.instagram.com/me`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
        console.error("[getInstagramAccountInfo] Error fetching Instagram account data:", data.error);
        throw new Error(data.error?.message || "Failed to fetch Instagram account data.");
    }
    
    if (data.account_type !== 'BUSINESS' && data.account_type !== 'MEDIA_CREATOR') {
        throw new Error(`Instagram account '${data.username}' must be a 'Business' or 'Creator' account.`);
    }
    
    console.log(`[getInstagramAccountInfo] Account info obtained:`, data);
    return data;
}

// --- Rota da API (GET) ---

export async function GET(req: NextRequest) {
    console.log('[API Callback] New GET request received.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateFromUrlStr = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const settingsUrl = new URL('/settings', req.nextUrl.origin);
    const cookieStore = cookies();
    const stateFromCookieStr = cookieStore.get('csrf_state')?.value;
    
    if (error) {
        console.warn(`[API Callback] Error received from Facebook: ${error} - ${errorDescription}`);
        settingsUrl.searchParams.set('error', error);
        if (errorDescription) settingsUrl.searchParams.set('error_description', errorDescription);
        return NextResponse.redirect(settingsUrl);
    }
    
    if (!code) {
        console.error(`[API Callback] ERROR: Authorization code not found in URL.`);
        settingsUrl.searchParams.set('error', 'authorization_code_missing');
        settingsUrl.searchParams.set('error_description', 'Authorization code not found.');
        return NextResponse.redirect(settingsUrl);
    }

     if (!stateFromUrlStr || !stateFromCookieStr) {
        console.error('[API Callback] ERROR: URL state or cookie state not found.');
        settingsUrl.searchParams.set('error', 'state_missing');
        settingsUrl.searchParams.set('error_description', 'Validation state parameter not found.');
        return NextResponse.redirect(settingsUrl);
    }

    try {
        const stateFromUrl = JSON.parse(stateFromUrlStr);
        const stateFromCookie = JSON.parse(stateFromCookieStr);

        if (stateFromUrl.csrf !== stateFromCookie.csrf) {
            const errorMsg = 'CSRF validation failed (state mismatch). Request is not trusted.';
            console.error(`[API Callback] ERROR: ${errorMsg}`);
            settingsUrl.searchParams.set('error', 'csrf_validation_failed');
            settingsUrl.searchParams.set('error_description', errorMsg);
            return NextResponse.redirect(settingsUrl);
        }
        
        const uid = stateFromCookie.uid;
        console.log(`[API Callback] State and CSRF validation successful for UID: ${uid}`);
        cookieStore.delete('csrf_state');

        const redirectUri = `${req.nextUrl.origin}/api/auth/instagram/callback`;
        
        const { accessToken: shortLivedToken } = await exchangeCodeForToken(code, redirectUri);
        const longLivedToken = await getLongLivedAccessToken(shortLivedToken);

        const accountInfo = await getInstagramAccountInfo(longLivedToken);
        const igUserId = accountInfo.id; 

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
            instagramUserId: igUserId,
            instagramHandle: accountInfo.username,
            followers: accountInfo.followers_count ? formatFollowers(accountInfo.followers_count) : null,
            bio: accountInfo.biography || existingData?.bio || null,
            photoURL: existingData?.photoURL || accountInfo.profile_picture_url || null,
            averageViews: null,
            averageLikes: null,
            averageComments: null,
        });

        console.log(`[API Callback] SUCCESS: Instagram data for UID ${uid} updated in Firestore.`);
        settingsUrl.searchParams.set('instagram_connected', 'true');
        return NextResponse.redirect(settingsUrl);

    } catch (e: any) {
        console.error("[API Callback] Error in Instagram callback flow:", e);
        settingsUrl.searchParams.set('error', 'instagram_flow_failed');
        settingsUrl.searchParams.set('error_description', e.message || 'Unknown error during Instagram connection.');
        return NextResponse.redirect(settingsUrl);
    }
}
