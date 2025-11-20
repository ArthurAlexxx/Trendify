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
