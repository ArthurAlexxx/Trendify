
'use client';
import LandingPage from './landing-page/page';

export default function Home() {
  // A lógica de redirecionamento foi removida.
  // A página inicial agora sempre renderizará a LandingPage.
  // A navegação para o dashboard será tratada pelos botões de login/painel.
  return <LandingPage />;
}
