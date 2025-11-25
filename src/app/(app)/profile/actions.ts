
'use server';

import { z } from 'zod';

// --- Instagram Schemas ---

const InstagramProfileResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  is_private: z.boolean().optional().default(false),
  profile_pic_url_hd: z.string().url(),
  biography: z.string(),
  full_name: z.string(),
  edge_owner_to_timeline_media: z.object({
    count: z.number().optional(),
  }).optional(),
  edge_followed_by: z.object({
    count: z.number().optional(),
  }).optional(),
  edge_follow: z.object({
    count: z.number().optional(),
  }).optional(),
  is_business_account: z.boolean().optional(),
}).passthrough();


export type InstagramProfileData = {
    id: string;
    username: string;
    isPrivate: boolean;
    isBusiness: boolean;
    profilePicUrlHd: string;
    biography: string;
    fullName: string;
    mediaCount: number;
    followersCount: number;
    followingCount: number;
}


// --- TikTok Schemas ---

const TikTokApi6ProfileSchema = z.object({
    username: z.string(),
    nickname: z.string(),
    user_id: z.string(),
    profile_image: z.string().url(),
    followers: z.number(),
    following: z.number(),
    total_videos: z.number(),
    total_heart: z.number(),
    verified: z.boolean(),
    description: z.string(),
    secondary_id: z.string().optional(),
    is_private: z.boolean(),
}).passthrough();


export type TikTokProfileData = {
    id: string;
    username: string;
    nickname: string;
    avatarUrl: string;
    bio: string;
    isVerified: boolean;
    isPrivate: boolean;
    secUid?: string;
    followersCount: number;
    followingCount: number;
    heartsCount: number;
    videoCount: number;
};

const TikTokPostSchema = z.object({
    id: z.string(),
    desc: z.string(),
    createTime: z.number(),
    video: z.object({
        cover: z.string().url(),
        playAddr: z.string().url(),
    }),
    author: z.object({
        uniqueId: z.string(),
    }).passthrough(),
    stats: z.object({
        diggCount: z.number(), // likes
        commentCount: z.number(),
        playCount: z.number(), // views
    }).passthrough(),
}).passthrough();

const TikTokPostResponseSchema = z.object({
  data: z.object({
    itemList: z.array(TikTokPostSchema).optional().default([]),
  }).optional(),
  aweme_list: z.array(TikTokPostSchema).optional().default([]),
}).passthrough();


export type TikTokPostData = {
    id: string;
    description: string;
    videoUrl: string;
    coverUrl: string;
    views: number;
    likes: number;
    comments: number;
};


// --- API Fetching Logic ---

async function fetchFromRapidApi(platform: 'instagram' | 'tiktok-profile' | 'tiktok-posts', usernameOrSecUid: string) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error('A chave da API (RAPIDAPI_KEY) não está configurada no servidor.');
    }

    const hosts = {
        instagram: process.env.INSTAGRAM_RAPIDAPI_HOST,
        tiktok: process.env.TIKTOK_RAPIDAPI_HOST,
    };
    
    let host: string | undefined;
    let path: string;
    let options: RequestInit;

    if (platform === 'instagram') {
        host = hosts.instagram;
        path = 'api/instagram/profile';
        options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameOrSecUid }),
        };
    } else if (platform === 'tiktok-profile') {
        host = hosts.tiktok;
        path = 'user/details';
        options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameOrSecUid }),
        };
    } else if (platform === 'tiktok-posts') {
        host = hosts.tiktok;
        path = 'api/user/posts';
        const url = new URL(`https://${host}/${path}`);
        url.searchParams.append('secUid', usernameOrSecUid);
        url.searchParams.append('count', '30');
        url.searchParams.append('cursor', '0');
        options = { method: 'GET', headers: {} };
        return fetchData(url.toString(), addRapidApiHeaders(options, host, apiKey));
    } else {
        throw new Error(`Plataforma '${platform}' desconhecida.`);
    }

    if (!host) {
        throw new Error(`O host da API para a plataforma '${platform}' não está configurado.`);
    }
    
    const url = new URL(`https://${host}/${path}`);
    return fetchData(url.toString(), addRapidApiHeaders(options, host, apiKey));
}

function addRapidApiHeaders(options: RequestInit, host: string, apiKey: string): RequestInit {
    options.headers = {
        ...options.headers,
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
    };
    return options;
}

async function fetchData(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API ERROR] Status ${response.status} para ${url}:`, errorText);
        
        if (response.status === 404) throw new Error(`Endpoint não encontrado. Verifique a URL da API.`);
        if (errorText.includes("You are not subscribed to this API")) throw new Error("Você não está inscrito nesta API na RapidAPI. Verifique sua assinatura e chave.");
        if (errorText.toLowerCase().includes("service unavailable")) throw new Error(`O serviço da API está indisponível. Tente mais tarde.`);
        if (errorText.toLowerCase().includes("this page is private")) throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        
        throw new Error(`A API retornou um erro: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();

    if (data.message && data.message.includes("Couldn't find user")) throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");
    if (data.error) throw new Error(data.error);

    return data;
}


export async function getInstagramProfile(username: string): Promise<InstagramProfileData> {
    try {
        const result = await fetchFromRapidApi('instagram', username);
        const parsed = InstagramProfileResultSchema.parse(result.data || result);

        if (parsed.is_private) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        if (parsed.is_business_account === false) { // Explicitly check for false
            throw new Error("Esta conta não é do tipo 'Comercial' ou 'Criador de Conteúdo'. Altere o tipo de conta nas configurações do Instagram para continuar.");
        }

        return {
            id: parsed.id,
            username: parsed.username,
            isPrivate: parsed.is_private || false,
            isBusiness: parsed.is_business_account || false,
            profilePicUrlHd: parsed.profile_pic_url_hd,
            biography: parsed.biography,
            fullName: parsed.full_name,
            mediaCount: parsed.edge_owner_to_timeline_media?.count || 0,
            followersCount: parsed.edge_followed_by?.count || 0,
            followingCount: parsed.edge_follow?.count || 0,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar perfil do Instagram: ${e.message}`);
    }
}


export async function getTikTokProfile(username: string): Promise<TikTokProfileData> {
    try {
        const result = await fetchFromRapidApi('tiktok-profile', username);
        const parsed = TikTokApi6ProfileSchema.parse(result);

        if (parsed.is_private) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }

        return {
            id: parsed.user_id,
            username: parsed.username,
            nickname: parsed.nickname,
            avatarUrl: parsed.profile_image,
            bio: parsed.description,
            isVerified: parsed.verified,
            isPrivate: parsed.is_private,
            secUid: parsed.secondary_id,
            followersCount: parsed.followers,
            followingCount: parsed.following,
            heartsCount: parsed.total_heart,
            videoCount: parsed.total_videos,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokProfile]`, e);
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil do TikTok: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar perfil do TikTok: ${e.message}`);
    }
}


export async function getTikTokPosts(secUid: string): Promise<TikTokPostData[]> {
    if (!secUid) {
        throw new Error('SEC UID do usuário é necessário para buscar os posts.');
    }
    try {
        const result = await fetchFromRapidApi('tiktok-posts', secUid);
        const parsed = TikTokPostResponseSchema.parse(result);
        const postsArray = parsed.data?.itemList || parsed.aweme_list;


        const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60);

        const recentPosts = postsArray.filter(post => post.createTime > thirtyOneDaysAgo);
        
        return recentPosts.map(post => ({
            id: post.id,
            description: post.desc,
            videoUrl: post.video.playAddr,
            coverUrl: post.video.cover,
            views: post.stats.playCount,
            likes: post.stats.diggCount,
            comments: post.stats.commentCount,
        }));

    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokPosts] ${e.message}`);
        if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts do TikTok: ${errorDetails}`);
        }
        throw new Error(`Falha ao buscar posts do TikTok: ${e.message}`);
    }
}
