
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  instagramHandle?: string;
  youtubeHandle?: string;
  niche?: string;
  bio?: string;
  followers?: string;
  engagement?: string;
  audience?: string;
}

export interface Metrica {
  id: string;
  nome: string;
  valor: string;
  alteracao: string;
  tipoAlteracao: 'aumento' | 'diminuicao';
}

export interface PontoDadosGrafico {
  id: string;
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

    
    

    

    