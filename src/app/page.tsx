'use client';

import {
  ArrowRight,
  BarChart2,
  Instagram,
  Youtube,
  BarChart,
  BrainCircuit,
  Award,
  Zap,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';

import { useUser } from '@/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const platformTags = [
  { icon: Instagram, label: 'Instagram' },
  { icon: Youtube, label: 'TikTok' },
  { icon: Youtube, label: 'YouTube' },
  { icon: BarChart, label: 'Analytics' },
];

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container flex h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
          >
            <div className="bg-foreground text-background h-7 w-7 flex items-center justify-center rounded-full">
              <ArrowRight className="h-4 w-4" />
            </div>
            trendify
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#recursos"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Recursos
            </Link>
            <Link
              href="#calculadora"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Calculadora
            </Link>
            <Link
              href="#depoimentos"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Depoimentos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: 'ghost',
                  className: 'font-manrope rounded-full',
                })}
              >
                Painel
              </Link>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({
                  variant: 'ghost',
                  className: 'font-semibold rounded-lg',
                })}
              >
                Entrar
              </Link>
            )}
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({}),
                'font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-primary-foreground shadow-lg'
              )}
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        <section className="py-24 sm:py-32 text-center">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-purple-300 bg-purple-50 text-purple-700 font-medium"
              >
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                Novo: Análise de Vídeo com IA
              </Badge>

              <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter mb-4 !leading-tight max-w-3xl mx-auto">
                Seu futuro nas
                <br />
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-gradient">
                  redes começa aqui
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                A plataforma de IA que transforma suas ideias em tendências.
                Analise, crie e monetize com precisão e criatividade.
              </p>

              <div className="flex justify-center items-center flex-wrap gap-3 mb-10">
                {platformTags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="py-2 px-4 text-sm font-medium bg-background"
                  >
                    <tag.icon className="h-4 w-4 mr-2" />
                    {tag.label}
                  </Badge>
                ))}
              </div>

              <div className="flex justify-center items-center gap-4">
                <Link
                  href="#calculadora"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'font-manrope rounded-lg text-base h-12 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-primary-foreground shadow-lg'
                  )}
                >
                  Se veja no futuro <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'font-manrope rounded-lg text-base h-12 px-8'
                  )}
                >
                  <BarChart2 className="mr-2 h-4 w-4" /> Já tenho conta
                </Link>
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                <span>Teste grátis de 7 dias</span>
                <span className="mx-2">•</span>
                <span>Sem cartão de crédito</span>
                <span className="mx-2">•</span>
                <span>Cancele quando quiser</span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} trendify. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
