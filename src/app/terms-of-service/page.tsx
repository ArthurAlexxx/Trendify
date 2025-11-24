
import { PageHeader } from '@/components/page-header';

export default function TermsOfServicePage() {
  return (
    <div className="container py-12">
      <PageHeader
        title="Termos de Serviço"
        description="Última atualização: 24 de Novembro de 2025"
      />
      <div className="prose prose-lg mx-auto max-w-4xl text-foreground/80">
        <p>
          Ao acessar e usar o aplicativo Trendify, você concorda em cumprir
          estes Termos de Serviço e todas as leis e regulamentos aplicáveis.
        </p>

        <h2>1. Uso da Licença</h2>
        <p>
          A permissão é concedida para usar temporariamente os materiais e
          ferramentas no Trendify para fins pessoais e comerciais, relacionados
          à gestão de sua carreira como criador de conteúdo. Esta é a concessão
          de uma licença, não uma transferência de título.
        </p>

        <h2>2. Isenção de Responsabilidade</h2>
        <p>
          As ferramentas e os dados fornecidos no Trendify são fornecidos "como
          estão". O Trendify não oferece garantias, expressas ou implícitas, e,
          por este meio, isenta e nega todas as outras garantias, incluindo,
          sem limitação, garantias implícitas ou condições de
          comercialização, adequação a um fim específico ou não violação de
          propriedade intelectual ou outra violação de direitos.
        </p>

        <h2>3. Limitações</h2>
        <p>
          Em nenhum caso o Trendify ou seus fornecedores serão responsáveis por
          quaisquer danos (incluindo, sem limitação, danos por perda de dados
          ou lucro, ou devido a interrupção dos negócios) decorrentes do uso
          ou da incapacidade de usar as ferramentas no Trendify.
        </p>

        <h2>4. Precisão dos Materiais</h2>
        <p>
          As sugestões e análises geradas pela IA no Trendify podem incluir
          erros técnicos, tipográficos ou fotográficos. Não garantimos que
          qualquer um dos materiais em seu aplicativo seja preciso, completo ou
          atual.
        </p>

        <h2>5. Modificações</h2>
        <p>
          O Trendify pode revisar estes termos de serviço para seu aplicativo a
          qualquer momento, sem aviso prévio. Ao usar este aplicativo, você
          concorda em ficar vinculado à versão então atual destes termos de
          serviço.
        </p>
      </div>
    </div>
  );
}

    