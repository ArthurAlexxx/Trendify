'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart,
  CheckCircle,
  Clapperboard,
  FileText,
  Lightbulb,
  MonitorPlay,
  Presentation,
  Radar,
  Menu,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUser } from '@/firebase';

const featureCards = [
  {
    icon: <BarChart className="w-8 h-8 mb-4 text-primary" />,
    title: 'Diagnóstico da Conta',
    description:
      'Entenda seu perfil como o algoritmo e receba um plano de crescimento personalizado.',
  },
  {
    icon: <Lightbulb className="w-8 h-8 mb-4 text-primary" />,
    title: 'Ideias e Roteiros com IA',
    description:
      'Receba 10 ideias otimizadas por nicho, com ganchos, roteiros completos e CTAs.',
  },
  {
    icon: <MonitorPlay className="w-8 h-8 mb-4 text-primary" />,
    title: 'Revisão Automática',
    description:
      'Nossa IA analisa seu vídeo antes de postar, sugerindo melhorias no ritmo, cortes e áudio.',
  },
  {
    icon: <Radar className="w-8 h-8 mb-4 text-primary" />,
    title: 'Radar de Trends',
    description:
      'Acesse trends do seu nicho, atualizadas diariamente com áudio e guia de uso.',
  },
  {
    icon: <Presentation className="w-8 h-8 mb-4 text-primary" />,
    title: 'Mídia Kit Profissional',
    description:
      'Gere um mídia kit com design premium e informações atualizadas em um clique.',
  },
  {
    icon: <FileText className="w-8 h-8 mb-4 text-primary" />,
    title: 'Propostas Inteligentes',
    description:
      'Crie propostas para marcas com a ajuda da IA, incluindo escopo e calculadora de preço.',
  },
];

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link
            href="/"
            className="text-2xl font-bold font-headline tracking-tighter text-foreground"
          >
            trendify
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Recursos
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Preços
            </Link>
            <Link
              href="#"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Painel
                </Link>
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    className: 'font-manrope rounded-full',
                  })}
                >
                  Minha Conta
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className={buttonVariants({
                    className: 'font-manrope rounded-full',
                  })}
                >
                  Comece grátis
                </Link>
              </>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background w-full sm:max-w-xs p-0">
              <div className="flex flex-col h-full">
                <div className="p-6">
                  <Link
                    href="/"
                    className="text-2xl font-bold font-headline text-foreground mb-4"
                  >
                    trendify
                  </Link>
                </div>
                <nav className="flex flex-col gap-4 text-lg font-medium p-6">
                  <SheetClose asChild>
                    <Link
                      href="#features"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Recursos
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="#pricing"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Preços
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Blog
                    </Link>
                  </SheetClose>
                </nav>
                <div className="mt-auto p-6 border-t border-border">
                  {user ? (
                    <SheetClose asChild>
                      <Link
                        href="/dashboard"
                        className={buttonVariants({
                          className: 'font-manrope w-full',
                          size: 'lg',
                        })}
                      >
                        Acessar Painel
                      </Link>
                    </SheetClose>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <SheetClose asChild>
                        <Link
                          href="/login"
                          className={buttonVariants({
                            variant: 'outline',
                            className: 'font-manrope w-full',
                            size: 'lg',
                          })}
                        >
                          Login
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/sign-up"
                          className={buttonVariants({
                            className: 'font-manrope w-full',
                            size: 'lg',
                          })}
                        >
                          Comece grátis
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative pt-40 pb-20 md:pt-56 md:pb-32 text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-background/80">
            <div className="absolute inset-0 bg-grid-pattern opacity-30 [mask-image:linear-gradient(to_bottom,white,transparent_80%)]" />
            <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
          </div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-headline tracking-tighter mb-6 !leading-tight">
                Transforme seus vídeos <br /> em tendências. Todos os dias.
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
                A Trendify usa IA para te ajudar a crescer no Instagram e TikTok:
                ideias, roteiros, revisão de vídeo, trends, mídia kit e
                propostas — tudo em um único lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={user ? '/dashboard' : '/sign-up'}
                  className={buttonVariants({
                    size: 'lg',
                    className:
                      'font-manrope rounded-full text-base h-12 px-8 shadow-lg shadow-primary/20 transition-transform hover:scale-105',
                  })}
                >
                  Começar agora <ArrowRight className="ml-2" />
                </Link>
                <Link
                  href="#"
                  className={buttonVariants({
                    size: 'lg',
                    variant: 'ghost',
                    className:
                      'font-manrope rounded-full text-base h-12 px-8 text-muted-foreground transition-transform hover:scale-105 hover:text-foreground hover:bg-secondary',
                  })}
                >
                  Ver demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container px-4 md:px-6">
            <p className="text-center text-muted-foreground font-medium mb-12">
              Criadoras que já descobriram o poder da clareza.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
              <div className="p-6 rounded-2xl">
                <p className="text-5xl font-bold font-headline text-primary mb-2">
                  +48%
                </p>
                <p className="text-muted-foreground">
                  crescimento médio em 30 dias
                </p>
              </div>
              <div className="p-6 rounded-2xl">
                <p className="text-5xl font-bold font-headline text-primary mb-2">
                  3x
                </p>
                <p className="text-muted-foreground">
                  mais engajamento com ganchos otimizados
                </p>
              </div>
              <div className="p-6 rounded-2xl">
                <p className="text-5xl font-bold font-headline text-primary mb-2">
                  +70%
                </p>
                <p className="text-muted-foreground">
                  consistência de postagem semanal
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight !leading-tight">
                Uma plataforma, todas as ferramentas.
              </h2>
              <p className="text-lg text-muted-foreground mt-4">
                Deixe a IA cuidar do trabalho pesado e foque no que você faz de
                melhor: criar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCards.map((feature, index) => (
                <Card
                  key={index}
                  className="p-8 border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="p-3 rounded-lg bg-primary/10 inline-block mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold font-headline mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  Depoimentos
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-8 !leading-tight">
                  O que as criadoras estão dizendo
                </h2>
                <div className="space-y-6">
                  <Card className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10">
                    <p className="text-foreground mb-4">
                      &quot;A Trendify mudou meu jogo. Finalmente tenho um
                      processo claro e minhas visualizações nunca foram tão
                      altas.&quot;
                    </p>
                    <div className="flex items-center gap-3">
                      <Image
                        src="https://picsum.photos/seed/person1/40/40"
                        alt="Mariana S."
                        width={40}
                        height={40}
                        className="rounded-full"
                        data-ai-hint="woman portrait"
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          Mariana S.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @marisstyle
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10">
                    <p className="text-foreground mb-4">
                      &quot;O assistente de propostas me economiza horas. Fechei
                      duas novas parcerias na primeira semana!&quot;
                    </p>
                    <div className="flex items-center gap-3">
                      <Image
                        src="https://picsum.photos/seed/person2/40/40"
                        alt="Julia F."
                        width={40}
                        height={40}
                        className="rounded-full"
                        data-ai-hint="woman smiling"
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          Julia F.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @juliacooks
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              <div className="relative h-[600px] w-full hidden lg:block rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <Image
                  src="https://picsum.photos/seed/mediakit/600/800"
                  alt="Media Kit Mockup"
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint="document dashboard"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight !leading-tight">
                Comece grátis e cresça no seu ritmo.
              </h2>
              <p className="text-lg text-muted-foreground mt-4">
                Planos simples e transparentes para cada estágio da sua carreira
                de criadora.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              <Card className="p-8 flex flex-col rounded-2xl border border-white/10 bg-card/50 backdrop-blur-sm">
                <h3 className="text-2xl font-bold font-headline mb-2">Free</h3>
                <p className="text-muted-foreground mb-6">
                  Para começar a organizar suas ideias.
                </p>
                <p className="text-5xl font-black font-headline mb-6">
                  R$0
                  <span className="text-lg font-medium text-muted-foreground">
                    /mês
                  </span>
                </p>
                <ul className="space-y-3 text-muted-foreground flex-1 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> 5 ideias de
                    vídeo/mês
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Análise
                    básica de perfil
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Radar de
                    trends limitado
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full font-manrope rounded-full h-11"
                >
                  Comece agora
                </Button>
              </Card>
              <Card className="p-8 flex flex-col rounded-2xl relative overflow-hidden border-2 border-primary shadow-2xl shadow-primary/20 bg-card/80 backdrop-blur-xl">
                <Badge className="absolute top-0 right-0 -mr-1 -mt-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full px-3 py-1 m-4">
                  MAIS POPULAR
                </Badge>
                <h3 className="text-2xl font-bold font-headline mb-2 text-primary">
                  Pro
                </h3>
                <p className="text-muted-foreground mb-6">
                  Para criadoras que querem acelerar.
                </p>
                <p className="text-5xl font-black font-headline mb-6">
                  R$49
                  <span className="text-lg font-medium text-muted-foreground">
                    /mês
                  </span>
                </p>
                <ul className="space-y-3 text-muted-foreground flex-1 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Ideias e
                    roteiros ilimitados
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Revisão de
                    10 vídeos/mês
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Radar de
                    trends completo
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Mídia kit
                    e propostas com IA
                  </li>
                </ul>
                <Button className="w-full font-manrope rounded-full h-11">
                  Escolher Pro
                </Button>
              </Card>
              <Card className="p-8 flex flex-col rounded-2xl border border-white/10 bg-card/50 backdrop-blur-sm">
                <h3 className="text-2xl font-bold font-headline mb-2">Elite</h3>
                <p className="text-muted-foreground mb-6">
                  Para agências e criadoras full-time.
                </p>
                <p className="text-5xl font-black font-headline mb-6">
                  R$129
                  <span className="text-lg font-medium text-muted-foreground">
                    /mês
                  </span>
                </p>
                <ul className="space-y-3 text-muted-foreground flex-1 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Tudo do Pro
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Análise de
                    múltiplos perfis
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" /> Suporte
                    prioritário
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full font-manrope rounded-full h-11"
                >
                  Fale conosco
                </Button>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-primary/10">
          <div className="container px-4 md:px-6 py-20 md:py-32">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tight mb-6 !leading-tight">
                O seu conteúdo pode ir muito mais longe.
              </h2>
              <p className="text-lg text-primary/80 mb-8">
                Junte-se a milhares de criadoras que estão transformando
                criatividade em carreira.
              </p>
              <Link
                href={user ? '/dashboard' : '/sign-up'}
                className={buttonVariants({
                  size: 'lg',
                  className:
                    'font-manrope text-base h-12 px-8 rounded-full shadow-lg shadow-primary/20 transition-transform hover:scale-105',
                })}
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-white/10">
        <div className="container px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Trendify. Todos os direitos
            reservados.
          </p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Termos
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Privacidade
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Contato
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
