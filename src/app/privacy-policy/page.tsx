
import { PageHeader } from '@/components/page-header';

export default function PrivacyPolicyPage() {
  return (
    <div className="container py-12">
      <PageHeader
        title="Política de Privacidade"
        description="Última atualização: 24 de Novembro de 2025"
      />
      <div className="prose prose-lg mx-auto max-w-4xl text-foreground/80">
        <p>
          Bem-vindo à Política de Privacidade da Trendify. A sua privacidade é
          importante para nós. É política da Trendify respeitar a sua
          privacidade em relação a qualquer informação sua que possamos coletar
          no nosso aplicativo.
        </p>

        <h2>1. Informações que coletamos</h2>
        <p>
          Coletamos informações que você nos fornece diretamente, como quando
          você cria uma conta, e informações que coletamos automaticamente,
          como dados de uso do aplicativo. Ao conectar sua conta do Instagram,
          podemos coletar dados públicos como nome de usuário, número de
          seguidores e métricas de engajamento, sempre com a sua permissão.
        </p>

        <h2>2. Como usamos as suas informações</h2>
        <p>
          Usamos as informações que coletamos para operar, manter e fornecer a
          você os recursos e a funcionalidade do aplicativo, como personalizar
          as sugestões de conteúdo da IA e exibir suas métricas no dashboard.
        </p>

        <h2>3. Compartilhamento de informações</h2>
        <p>
          Não compartilhamos suas informações pessoais com empresas,
          organizações ou indivíduos externos, exceto nos seguintes casos: com
          o seu consentimento, para processamento externo (por exemplo, APIs de
          IA como a da OpenAI) ou por razões legais.
        </p>

        <h2>4. Segurança</h2>
        <p>
          Trabalhamos duro para proteger suas informações de acesso não
          autorizado ou alteração, divulgação ou destruição não autorizada.
          Usamos criptografia e outras medidas de segurança para ajudar a
          proteger suas informações.
        </p>

        <h2>5. Seus Direitos</h2>
        <p>
          Você tem o direito de acessar, corrigir ou excluir suas informações
          pessoais. Você pode gerenciar a maioria das suas informações
          diretamente na página de perfil e configurações do aplicativo.
        </p>

        <h2>Contato</h2>
        <p>
          Se você tiver alguma dúvida sobre esta Política de Privacidade, entre
          em contato conosco através da página de suporte.
        </p>
      </div>
    </div>
  );
}

    