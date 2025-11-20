import type { Timestamp } from 'firebase/firestore';

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
  id: string;
  dia: string;
  tarefa: string;
  detalhes: string;
  concluido: boolean;
}

export interface IdeiaSalva {
  id: string;
  userId: string;
  titulo: string;
  conteudo: string;
  origem: string;
  concluido: boolean;
  createdAt: Timestamp;
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
