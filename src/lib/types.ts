
import type { Timestamp, FieldValue } from 'firebase/firestore';
import { z } from 'zod';

export type Plan = 'pro' | 'free' | 'premium';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  createdAt: Timestamp;
  role?: UserRole;
  tokenUsage?: number;
  
  // Metas de seguidores
  totalFollowerGoal?: number;
  instagramFollowerGoal?: number;
  tiktokFollowerGoal?: number;
  
  niche?: string;
  bio?: string;
  audience?: string;
  instagramHandle?: string;
  instagramFollowers?: string;
  instagramAverageViews?: string;
  instagramAverageLikes?: string;
  instagramAverageComments?: string;
  lastInstagramSync?: Timestamp;
  tiktokHandle?: string;
  tiktokFollowers?: string;
  tiktokAverageViews?: string;
  tiktokAverageLikes?: string;
  tiktokAverageComments?: string;
  lastTikTokSync?: Timestamp;
  subscription?: {
    status: 'active' | 'inactive';
    plan: Plan;
    cycle?: 'monthly' | 'annual';
    expiresAt?: Timestamp | null;
    paymentId?: string | null;
  }
}

export interface WebhookLog {
  id: string;
  receivedAt: Timestamp;
  eventType: string;
  payload: any;
  isSuccess: boolean;
  amount?: number;
  customerEmail?: string;
}

export interface DailyUsage {
  id: string;
  date: string; // YYYY-MM-DD
  videoAnalyses: number;
  geracoesAI: number;
}


export interface IdeiaSalva {
  id: string;
  userId: string;
  titulo: string;
  conteudo: string;
  origem: string;
  concluido: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  aiResponseData?: any; // Store the full AI response object
}

export interface ConteudoAgendado {
  id: string;
  userId: string;
  title: string;
  date: Timestamp;
  contentType: 'Reels' | 'Story' | 'Post';
  status: 'Agendado' | 'Publicado' | 'Rascunho';
  notes?: string;
  createdAt: Timestamp;
}

export interface AnaliseVideo {
    id: string;
    userId: string;
    analysisName?: string;
    videoUrl?: string; // Changed from videoFileName to videoUrl
    videoFileName?: string;
    analysisData: any; // O objeto JSON da análise
    createdAt: Timestamp;
}


// --- Tipos para Análise de Vídeo ---
export const AnalyzeVideoInputSchema = z.object({
  videoUrl: z.string().url().describe('A URL pública do vídeo a ser analisado.'),
  prompt: z.string().describe('A instrução para orientar a análise do vídeo.'),
});
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;

export const AnalyzeVideoOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).length(3).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
  estimatedHeatmap: z.string().describe("Uma análise textual de onde a retenção do público provavelmente cai, com base no ritmo e estrutura do vídeo. Ex: 'A retenção provavelmente cai entre 8s-12s devido à explicação muito longa.'"),
  comparativeAnalysis: z.string().describe("Uma breve comparação do vídeo analisado com padrões de sucesso do nicho. Ex: 'Comparado a outros vídeos de receita, o seu tem uma ótima fotografia, mas o ritmo é 20% mais lento.'"),
});
export type AnalyzeVideoOutput = z.infer<typeof AnalyzeVideoOutputSchema>;
// --- Fim dos Tipos para Análise de Vídeo ---


export interface MetricSnapshot {
    id: string;
    date: Timestamp;
    platform: 'instagram' | 'tiktok';
    followers: string;
    views: string;
    likes: string;
    comments: string;
}

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
};

export type InstagramPostData = {
    id: string;
    shortcode: string;
    caption: string | null;
    mediaUrl: string;
    likes: number;
    comments: number;
    is_video: boolean;
    video_view_count?: number;
    fetchedAt: Timestamp;
};

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

export type TikTokPost = {
    id: string;
    shareUrl?: string;
    description: string;
    coverUrl: string;
    views: number;
    likes: number;
    comments: number;
    createdAt?: Timestamp; // Adicionado para data de criação
    fetchedAt: Timestamp;
};

export interface PontoDadosGrafico {
  data: string;
  alcance: number;
  engajamento: number;
}

export interface ItemRoteiro {
  dia: string;
  tarefa: string;
  detalhes: string;
  concluido: boolean;
}

export interface PlanoSemanal {
  id: string;
  userId: string;
  items: ItemRoteiro[];
  desempenhoSimulado: PontoDadosGrafico[];
  effortLevel: 'Baixo' | 'Médio' | 'Alto';
  priorityIndex: string[];
  realignmentTips: string;
  createdAt: Timestamp;
}

    