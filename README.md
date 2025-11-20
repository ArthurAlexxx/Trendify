# Trendify: Growth OS para Criadores

Este é um aplicativo Next.js construído com o Firebase Studio. É um sistema operacional potencializado por IA, projetado para ajudar criadores de conteúdo a planejar, criar estratégias e monetizar seu conteúdo.

## ✨ Funcionalidades

- **Geração de Conteúdo com IA**: Receba planos de conteúdo semanais, ideias de vídeo, propostas de publicidade e mais, tudo gerado por IA.
- **Calendário de Conteúdo**: Planeje e visualize sua agenda de publicações.
- **Assistente de Mídia Kit**: Gere automaticamente mídia kits profissionais e sugestões de preços para enviar a marcas.
- **Painel (Dashboard)**: Um hub central para visualizar métricas-chave, tarefas pendentes e seu roteiro de conteúdo semanal.
- **Integração com Firebase**: Autenticação segura e armazenamento de dados com Firebase.
- **Sistema de Pagamentos**: Integração com Abacate Pay para assinaturas via PIX.

## 🚀 Como Começar

O projeto está pronto para ser implantado. Para executá-lo localmente, você pode usar o script `dev`.

```bash
npm run dev
```

Isso iniciará o servidor de desenvolvimento, geralmente em `http://localhost:9002`.

## ⚙️ Deploy & Variáveis de Ambiente

Este projeto é otimizado para deploy na **Vercel**.

Para implantar sua aplicação, você precisará configurar as seguintes variáveis de ambiente nas configurações do seu projeto na Vercel:

### Configuração do Firebase

O aplicativo usa o Firebase para autenticação e banco de dados. Você precisa fornecer as chaves de configuração do seu projeto Firebase.

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

Esses valores podem ser encontrados nas configurações do seu projeto no Console do Firebase.

Para a integração do lado do servidor (Server-Side), como nos webhooks, você também precisará das credenciais da sua conta de serviço do Firebase:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: O conteúdo do arquivo JSON da sua conta de serviço do Firebase. Você pode gerar este arquivo no Console do Firebase em `Configurações do Projeto > Contas de Serviço > Gerar nova chave privada`. Copie o conteúdo completo do arquivo JSON e cole como o valor desta variável.

### Chave da API da OpenAI

As funcionalidades de IA são potencializadas pela OpenAI. Você precisa fornecer sua própria chave de API.

- `OPENAI_API_KEY`

Esta chave deve ser mantida em segredo e configurada apenas no ambiente do servidor (Vercel).

### Chaves da Abacate Pay

O sistema de pagamento é integrado com a Abacate Pay.

- `ABACATE_API_KEY`: Sua chave de API secreta do Abacate Pay.
- `ABACATE_WEBHOOK_SECRET`: A chave secreta para validar os webhooks recebidos do Abacate Pay.

---

Uma vez que essas variáveis estejam configuradas, você pode conectar seu repositório do GitHub à Vercel e fazer o deploy da aplicação.
