
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

const TikTokStatsSchema = z.union([
    z.object({
        followerCount: z.union([z.string(), z.number()]),
        followingCount: z.union([z: .string(), z.number()]),
        heartCount: z.union([z.string(), z.number()]),
        videoCount: z.union([z.string(), z.number()]),
        diggCount: z.union([z.string(), z.number()]).optional(),
        friendCount: z.union([z.string(), z.number()]).optional(),
        heart: z.union([z.string(), z.number()]).optional(),
    }).passthrough(),
    z.string().optional(),
    z.null()
]);


const TikTokUserSchema = z.object({
    id: z.string(),
    uniqueId: z.string(),
    nickname: z.string(),
    avatarLarger: z.string().url(),
    signature: z.string(), // bio
    verified: z.boolean(),
    privateAccount: z.boolean(),
    secUid: z.string().optional(),
    bioLink: z.union([
      z.object({ link: z.string().optional(), risk: z.number().optional() }).passthrough(),
      z.string(),
      z.null(),
    ]).optional(),
}).passthrough();


const TikTokProfileSchema = z.object({
    stats: TikTokStatsSchema.optional(),
    statsV2: TikTokStatsSchema.optional(),
    user: TikTokUserSchema,
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

async function fetchFromRapidApi(platform: 'instagram' | 'tiktok', endpoint: 'profile' | 'posts', usernameOrSecUid: string) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error('A chave da API (RAPIDAPI_KEY) não está configurada no servidor.');
    }

    const hosts = {
        instagram: process.env.INSTAGRAM_RAPIDAPI_HOST,
        tiktok: process.env.TIKTOK_RAPIDAPI_HOST,
    };
    
    const host = hosts[platform];
    if (!host) {
        throw new Error(`O host da API para a plataforma '${platform}' não está configurado.`);
    }

    const paths = {
        instagram: {
            profile: 'api/instagram/profile',
            posts: 'v1/user-posts',
        },
        tiktok: {
            profile: 'api/user/info',
            posts: 'api/user/posts',
        }
    }

    const path = paths[platform][endpoint];
    let url: URL;
    let options: RequestInit;

    if (platform === 'tiktok') {
        url = new URL(`https://${host}/${path}`);
        options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': host,
            },
        };
        if (endpoint === 'profile') {
            url.searchParams.append('uniqueId', usernameOrSecUid);
        } else { // posts
            url.searchParams.append('secUid', usernameOrSecUid);
            url.searchParams.append('count', '30');
            url.searchParams.append('cursor', '0');
        }
    } else { // Instagram
        url = new URL(`https://${host}/${path}`);
        options = {
            method: 'POST',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': host,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: usernameOrSecUid })
        };
    }

    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API ERROR - ${platform}/${endpoint}] Status ${response.status}:`, errorText);
        
        if (response.status === 404) throw new Error(`Endpoint '${path}' não encontrado. Verifique a URL da API.`);
        if (errorText.includes("You are not subscribed to this API")) throw new Error("Você não está inscrito nesta API na RapidAPI. Verifique sua assinatura e chave.");
        if (errorText.toLowerCase().includes("service unavailable")) throw new Error(`O serviço da API (${platform}) está indisponível. Tente mais tarde.`);
        if (errorText.toLowerCase().includes("this page is private")) throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        
        throw new Error(`A API (${platform}) retornou um erro: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();

    if (platform === 'instagram' && data.message) throw new Error(data.message);
    
    if (platform === 'tiktok' && data.statusCode !== 0 && data.status_msg) {
        throw new Error(data.status_msg || `API do TikTok retornou status ${data.statusCode}`);
    }
    
    // Instagram nests in `data` in some cases, TikTok has a different structure.
    if (platform === 'instagram') return data.data || data;
    if (platform === 'tiktok') {
        if(endpoint === 'profile') return data.userInfo || data;
        return data; // For posts, the data is at the root
    }
    
    return data;
}


export async function getInstagramProfile(username: string): Promise<InstagramProfileData> {
    try {
        const result = await fetchFromRapidApi('instagram', 'profile', username);
        const parsed = InstagramProfileResultSchema.parse(result);

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
        const result = await fetchFromRapidApi('tiktok', 'profile', username);
        const parsed = TikTokProfileSchema.parse(result);

        if (parsed.user.privateAccount) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        const stats: any = parsed.statsV2 || parsed.stats;
        
        const toNumber = (val: string | number | undefined | null): number => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            return parseInt(val, 10) || 0;
        };

        return {
            id: parsed.user.id,
            username: parsed.user.uniqueId,
            nickname: parsed.user.nickname,
            avatarUrl: parsed.user.avatarLarger,
            bio: parsed.user.signature,
            isVerified: parsed.user.verified,
            isPrivate: parsed.user.privateAccount,
            secUid: parsed.user.secUid,
            followersCount: toNumber(stats?.followerCount),
            followingCount: toNumber(stats?.followingCount),
            heartsCount: toNumber(stats?.heartCount),
            videoCount: toNumber(stats?.videoCount),
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokProfile] ${e.message}`);
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
        const result = await fetchFromRapidApi('tiktok', 'posts', secUid);
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
