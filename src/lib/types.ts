export interface Metrica {
  nome: string;
  valor: string;
  alteracao: string;
  tipoAlteracao: 'aumento' | 'diminuicao';
}

export interface PontoDadosMetrica {
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

export interface Tendencia {
  id: string;
  titulo: string;
  tipo: 'Som' | 'Estilo';
  nicho: string;
  pais: string;
  contagemRegressiva: number;
  explicacao: string;
  exampleImageUrl: string;
  exampleImageHint: string;
}
