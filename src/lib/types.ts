
import type { Timestamp } from 'firebase/firestore';

export type Plan = 'pro' | 'free' | 'premium';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  niche?: string;
  bio?: string;
  audience?: string;
  instagramHandle?: string;
  instagramFollowers?: string;
  instagramAverageViews?: string;
  instagramAverageLikes?: string;
  instagramAverageComments?: string;
  tiktokHandle?: string;
  tiktokFollowers?: string;
  tiktokAverageViews?: string;
  tiktokAverageLikes?: string;
  tiktokAverageComments?: string;
  subscription?: {
    status: 'active' | 'inactive';
    plan: Plan;
    expiresAt?: Timestamp | null;
    paymentId?: string | null;
  }
}

export interface DailyUsage {
  id: string;
  date: string; // YYYY-MM-DD
  videoAnalyses: number;
  geracoesAI: number;
}


export interface PontoDadosGrafico {
  id?: string; // Optional as it might be nested
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
  items: ItemRoteiro[];
  desempenhoSimulado: PontoDadosGrafico[];
  createdAt: Timestamp;
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
    videoUrl: string;
    videoFileName: string;
    analysisData: any; // O objeto JSON da análise
    createdAt: Timestamp;
}

export interface MetricSnapshot {
    id: string;
    userId: string;
    date: Timestamp;
    platform: 'instagram' | 'tiktok';
    followers: string;
    views: string;
    likes: string;
    comments: string;
}
    
