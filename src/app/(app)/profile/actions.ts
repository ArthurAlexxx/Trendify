
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
    followingCount: number;
}

const InstagramPostSchema = z.object({
    id: z.string(),
    shortcode: z.string(),
    caption: z.string().optional().nullable(),
    media_url: z.string().url(),
    thumbnail_url: z.string().url().optional().nullable(),
    like_count: z.number(),
    comment_count: z.number(),
}).passthrough();

export type InstagramPostData = {
    id: string;
    caption: string | null;
    mediaUrl: string;
    likes: number;
    comments: number;
};


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
    video_id: z.string(),
    description: z.string(),
    cover: z.string().url(),
    statistics: z.object({
        number_of_plays: z.number(),
        number_of_hearts: z.number(),
        number_of_comments: z.number(),
    }).passthrough(),
}).passthrough();

const TikTokPostResponseSchema = z.object({
  username: z.string(),
  videos: z.array(TikTokPostSchema).optional().default([]),
}).passthrough();


export type TikTokPostData = {
    id: string;
    description: string;
    coverUrl: string;
    views: number;
    likes: number;
    comments: number;
};


// --- API Fetching Logic ---

async function fetchFromRapidApi(platform: 'instagram-profile' | 'instagram-posts' | 'tiktok-profile' | 'tiktok-posts', username: string) {
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

    switch (platform) {
        case 'instagram-profile':
            host = hosts.instagram;
            path = 'api/instagram/profile';
            options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) };
            break;
        case 'instagram-posts':
             host = hosts.instagram;
             path = 'api/instagram/posts';
             options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, maxId: '' }) };
             break;
        case 'tiktok-profile':
            host = hosts.tiktok;
            path = 'user/details';
            options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) };
            break;
        case 'tiktok-posts':
            host = hosts.tiktok;
            path = 'user/videos';
            options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) };
            break;
        default:
            throw new Error(`Plataforma '${platform}' desconhecida.`);
    }

    if (!host) {
        throw new Error(`O host da API para a plataforma '${platform.split('-')[0]}' não está configurado.`);
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
        const result = await fetchFromRapidApi('instagram-profile', username);
        const dataToParse = result.result || result;
        const parsed = InstagramProfileResultSchema.parse(dataToParse);

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


export async function getInstagramPosts(username: string): Promise<InstagramPostData[]> {
    if (!username) {
        throw new Error('Nome de usuário é necessário para buscar os posts.');
    }
    try {
        const result = await fetchFromRapidApi('instagram-posts', username);
        
        // Handle cases where the data is nested under 'result'
        const dataToParse = result.result || result;

        const parsed = z.array(InstagramPostSchema).parse(dataToParse);
        
        return parsed.map(post => ({
            id: post.id,
            caption: post.caption,
            mediaUrl: post.media_url,
            likes: post.like_count,
            comments: post.comment_count,
        }));
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramPosts] ${e.message}`);
        if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts do Instagram: ${errorDetails}`);
        }
        throw new Error(`Falha ao buscar posts do Instagram: ${e.message}`);
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


export async function getTikTokPosts(username: string): Promise<TikTokPostData[]> {
    if (!username) {
        throw new Error('Nome de usuário é necessário para buscar os posts.');
    }
    try {
        const result = await fetchFromRapidApi('tiktok-posts', username);
        const parsed = TikTokPostResponseSchema.parse(result);
        
        const recentPosts = parsed.videos.filter(post => {
            if (!post.create_time) return false;
            const postDate = new Date(Number(post.create_time) * 1000);
            const thirtyOneDaysAgo = new Date();
            thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
            return postDate > thirtyOneDaysAgo;
        });

        return recentPosts.map(post => ({
            id: post.video_id,
            description: post.description,
            coverUrl: post.cover,
            views: post.statistics.number_of_plays,
            likes: post.statistics.number_of_hearts,
            comments: post.statistics.number_of_comments,
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

    
