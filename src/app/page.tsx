
'use client';

import {
  ArrowRight,
  Briefcase,
  Lightbulb,
  LineChart,
  Sparkles,
  Target,
  Video,
  Check,
  Loader2,
  Crown,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const features = [
  {
    icon: Lightbulb,
    title: 'Roteiros e Ganchos Virais',
    description:
      'Use IA para gerar ideias de vídeo que capturam a atenção e engajam seu público.',
  },
  {
    icon: Target,
    title: 'Análise de Performance',
    description:
      'Receba diagnósticos do que funciona (ou não) no seu conteúdo e otimize sua estratégia.',
    plan: 'pro',
  },
  {
    icon: Briefcase,
    title: 'Mídia Kit e Propostas',
    description:
      'Crie propostas comerciais e um mídia kit profissional para fechar parcerias com marcas.',
    plan: 'premium',
  },
];

const whyTrendify = [
  {
    title: 'Foco em Ação, Não em Vaidade',
    description:
      'Métricas são importantes, mas nosso foco é no que fazer com elas. Entregamos planos e roteiros, não apenas gráficos.',
  },
  {
    title: 'IA Especialista em Criadores',
    description:
      'Nossa inteligência artificial é treinada com milhares de vídeos virais e estratégias de conteúdo que funcionam hoje.',
  },
  {
    title: 'Do Roteiro à Proposta',
    description:
      'Cobrimos todo o ciclo do criador: da ideia inicial até a prospecção de marcas e monetização do seu conteúdo.',
  },
];

const faqItems = [
  {
    question: 'Qual a diferença entre os planos Pro e Premium?',
    answer:
      'O plano Pro oferece todas as ferramentas essenciais para crescimento, como ideias ilimitadas e planejamento semanal. O plano Premium inclui tudo do Pro, mais recursos avançados de monetização como o Assistente de Publis, Mídia Kit e acesso antecipado a novas funcionalidades.',
  },
   {
    question: 'A Trendify funciona para qualquer nicho?',
    answer:
      'Sim! Nossa IA é treinada para se adaptar a dezenas de nichos, de beleza e fitness a tecnologia e finanças. As sugestões são personalizadas para o seu público.',
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento, sem burocracia. Você manterá o acesso aos recursos do seu plano até o final do período de faturamento.',
  },
];

const calculatorSchema = z.object({
  niche: z.string().min(1, 'Selecione um nicho'),
  followers: z.number().min(1, 'Deve ser maior que 0'),
  goal: z.number().min(1, 'Deve ser maior que 0'),
  reelsPerMonth: z.number().min(0),
});

type CalculatorInput = z.infer<typeof calculatorSchema>;

const NICHES = [
  'Moda',
  'Beleza',
  'Fitness',
  'Culinária',
  'Lifestyle',
  'Tecnologia',
  'Finanças',
  'Viagem',
];

const BENCHMARKS: Record<
  string,
  { baseGrowth: number; cpmRange: [number, number]; reelsMultiplier: number }
> = {
  Moda: { baseGrowth: 0.06, cpmRange: [20, 80], reelsMultiplier: 0.005 },
  Beleza: { baseGrowth: 0.05, cpmRange: [25, 90], reelsMultiplier: 0.006 },
  Fitness: { baseGrowth: 0.07, cpmRange: [15, 70], reelsMultiplier: 0.007 },
  Culinária: { baseGrowth: 0.05, cpmRange: [10, 50], reelsMultiplier: 0.004 },
  Lifestyle: { baseGrowth: 0.04, cpmRange: [18, 65], reelsMultiplier: 0.005 },
  Tecnologia: { baseGrowth: 0.08, cpmRange: [30, 120], reelsMultiplier: 0.008 },
  Finanças: { baseGrowth: 0.09, cpmRange: [40, 150], reelsMultiplier: 0.009 },
  Viagem: { baseGrowth: 0.06, cpmRange: [22, 85], reelsMultiplier: 0.006 },
  Default: { baseGrowth: 0.05, cpmRange: [15, 60], reelsMultiplier: 0.005 },
};

const PlatformPill = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-md transition-transform hover:-translate-y-1">
    <span className="text-primary">{icon}</span>
    <span className="font-medium text-sm text-foreground">{text}</span>
  </div>
);

const platforms = [
  {
    name: 'Instagram',
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
      >
        <path
          d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.123 1.383S.936 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.383 2.123.664.664 1.335 1.077 2.123 1.383.765.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.717 2.123-1.383.664-.664 1.077-1.335 1.383-2.123.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.148-.558-2.913-.306-.789-.717-1.459-1.383-2.123C20.647.936 19.976.525 19.188.22c-.765-.296-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.07 1.17.055 1.805.248 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.48 1.002-.899 1.422-.423.419-.867.678-1.433.895-.425.166-1.061.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.999-.48-1.422-.899-.421-.423-.679-.867-.896-1.433-.164-.425-.36-1.061-.413-2.235-.057-1.274-.07-1.649-.07-4.859 0-3.211.015-3.586.07-4.859.061-1.171.255-1.816.413-2.236.224-.569.48-1.002.896-1.422.42-.421.819-.679 1.381-.896.423-.164 1.057-.36 2.227-.413C8.415 2.172 8.796 2.16 12 2.16zm0 5.482c-2.49 0-4.508 2.019-4.508 4.508s2.019 4.508 4.508 4.508c2.49 0 4.508-2.019 4.508-4.508s-2.019-4.508-4.508-4.508zm0 7.352c-1.576 0-2.844-1.268-2.844-2.844s1.268-2.844 2.844-2.844c1.576 0 2.844 1.268 2.844 2.844s-1.268 2.844-2.844 2.844zm4.908-7.932c0 .622-.504 1.125-1.125 1.125s-1.125-.503-1.125-1.125.504-1.125 1.125-1.125 1.125.503 1.125 1.125z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    icon: <Video className="h-5 w-5" />,
  },
  {
    name: 'YouTube',
    icon: (
      <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
      >
        <path
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    icon: <LineChart className="h-5 w-5" />,
  },
];

export default function LandingPage() {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<CalculatorInput>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      niche: 'Moda',
      followers: 10000,
      goal: 100000,
      reelsPerMonth: 20,
    },
  });

  const calculateGrowth = useCallback((data: CalculatorInput) => {
    setIsCalculating(true);
    const { niche, followers, goal, reelsPerMonth } = data;
    const benchmark = BENCHMARKS[niche] || BENCHMARKS.Default;

    const monthlyGrowthRate =
      benchmark.baseGrowth + reelsPerMonth * benchmark.reelsMultiplier;
    let months = 0;
    let currentFollowers = followers;
    const growthData = [{ month: 0, followers: currentFollowers }];

    while (currentFollowers < goal) {
      months++;
      currentFollowers *= 1 + monthlyGrowthRate;
      growthData.push({
        month: months,
        followers: Math.round(currentFollowers),
      });
      if (months > 120) break; // safety break
    }

    const estimateEarnings = (f: number) => {
      const viewRate = [0.2, 0.5]; // 20% to 50% of followers see a reel
      const views = [f * viewRate[0], f * viewRate[1]];
      const earnings = [
        (views[0] / 1000) * benchmark.cpmRange[0],
        (views[1] / 1000) * benchmark.cpmRange[1],
      ];
      const monthlyPublis = Math.max(1, Math.round(reelsPerMonth * 0.2)); // 20% of content can be sponsored
      return [
        Math.round(earnings[0] * monthlyPublis),
        Math.round(earnings[1] * monthlyPublis),
      ];
    };

    const currentEarnings = estimateEarnings(followers);
    const goalEarnings = estimateEarnings(goal);

    const trendSuggestions = [
      { hook: '3 erros que você comete em...', icon: '🚫' },
      { hook: 'O segredo que ninguém conta sobre...', icon: '🤫' },
      { hook: 'Meu top 5 de produtos para...', icon: '🏆' },
    ];

    setTimeout(() => {
      setResults({
        months,
        goalDate: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000),
        currentEarnings,
        goalEarnings,
        growthData,
        trendSuggestions,
        reelsPerMonth,
      });
      setIsCalculating(false);
      setStep(1);
    }, 1000);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  };

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
              href="#beneficios"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Benefícios
            </Link>
            <Link
              href="#calculadora"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Calculadora
            </Link>
            <Link
              href="#precos"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Preços
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 sm:py-32 text-center relative overflow-hidden">
          <div
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[1500px] h-[1500px] bg-gradient-radial from-purple-100/50 via-background to-background -z-10"
            aria-hidden="true"
          />
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-purple-300 bg-purple-50 text-purple-700 font-medium rounded-full px-4 py-1"
              >
                <Sparkles className="h-3 w-3 mr-2 text-purple-500" />
                Planos Pro e Premium com pagamento via PIX
              </Badge>

              <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter mb-6 !leading-tight max-w-4xl mx-auto">
                Conteúdo inteligente,{' '}
                <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-gradient">
                  crescimento real.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                A Trendify usa IA para transformar seus dados em um plano de
                ação claro, ajudando você a crescer e monetizar seu conteúdo.
              </p>

              <div className="flex justify-center items-center gap-4 mb-10">
                {platforms.map((platform) => (
                  <PlatformPill
                    key={platform.name}
                    icon={platform.icon}
                    text={platform.name}
                  />
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
                  Calcular meu crescimento
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'font-manrope rounded-lg text-base h-12 px-8 bg-background/50'
                  )}
                >
                  Já tenho conta
                </Link>
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                <span>Comece com a conta gratuita</span>
                <span className="mx-2">•</span>
                <span>Sem cartão de crédito</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="beneficios" className="py-20 sm:py-24">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight mb-4">
              Menos esforço, mais inteligência.
            </h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Tudo que você precisa para crescer de forma inteligente, em um só
              lugar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="text-left h-full bg-card/50 shadow-lg transition-all duration-300 rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div className="bg-primary/10 text-primary p-3 rounded-lg">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      {feature.plan && (
                        <Badge variant={feature.plan === 'premium' ? 'default' : 'secondary'} className={cn(feature.plan === 'premium' && 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30')}>
                           {feature.plan === 'premium' ? 'Premium' : 'Pro'}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-bold text-lg mb-2 text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Section */}
        <section id="why-trendify" className="py-20 sm:py-24 bg-muted/30">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight mb-4">
                  Por que a Trendify?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Nós não somos apenas mais uma ferramenta de análise. Somos um
                  sistema operacional para o crescimento do criador de
                  conteúdo.
                </p>
                <div className="space-y-6">
                  {whyTrendify.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                        <ArrowRight />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.title}</h3>
                        <p className="text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-background/50 p-8 rounded-2xl">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, amount: 0.5 }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" /> Roteiro
                        Sugerido
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-bold">Gancho:</p>
                        <p className="text-muted-foreground">
                          "Você está limpando seu rosto do jeito ERRADO. 😱"
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Roteiro:</p>
                        <p className="text-muted-foreground">
                          "[CENA RÁPIDA de alguém esfregando o rosto com força]
                          Para tudo! A maioria das pessoas agride a pele. O
                          segredo é..."
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">CTA:</p>
                        <p className="text-muted-foreground">
                          "Comente 'PELE' e eu te mando o passo a passo
                          completo."
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section id="calculadora" className="py-20 sm:py-24 bg-background">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Se veja no futuro
              </h2>
              <p className="text-lg text-muted-foreground">
                Responda 3 perguntas e, em 60 segundos, mostraremos seu plano,
                tempo até a meta e potencial de ganhos no seu nicho.
              </p>
            </div>

            <Card className="max-w-4xl mx-auto p-4 sm:p-6 rounded-2xl bg-muted/30">
              <CardContent className="p-2 sm:p-4">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div {...motionProps} key="step0">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(calculateGrowth)}
                          className="space-y-8"
                        >
                          <div className="grid md:grid-cols-3 gap-6">
                            <FormField
                              control={form.control}
                              name="niche"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-semibold">
                                    Qual seu nicho principal?
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-12 text-base bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {NICHES.map((n) => (
                                        <SelectItem key={n} value={n}>
                                          {n}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="followers"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-semibold">
                                    Seguidores Atuais
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value, 10) || 0
                                        )
                                      }
                                      className="h-12 text-base bg-background"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="goal"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-semibold">
                                    Sua Meta de Seguidores
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value, 10) || 0
                                        )
                                      }
                                      className="h-12 text-base bg-background"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="reelsPerMonth"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-baseline mb-2">
                                  <FormLabel className="font-semibold">
                                    Quantos Reels você posta por mês?
                                  </FormLabel>
                                  <span className="text-xl font-bold text-primary">
                                    {field.value}
                                  </span>
                                </div>
                                <FormControl>
                                  <Slider
                                    defaultValue={[field.value]}
                                    max={60}
                                    step={1}
                                    onValueChange={(v) => field.onChange(v[0])}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            size="lg"
                            className="w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-primary-foreground shadow-lg"
                            disabled={isCalculating}
                          >
                            {isCalculating ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />{' '}
                                Calculando...
                              </>
                            ) : (
                              'Calcular meu Potencial'
                            )}
                          </Button>
                        </form>
                      </Form>
                    </motion.div>
                  )}

                  {step === 1 && results && (
                    <motion.div
                      {...motionProps}
                      key="step1"
                      className="space-y-8"
                    >
                      <div className="text-center">
                        <h3 className="text-2xl md:text-3xl font-bold font-headline">
                          Sua projeção de crescimento está pronta!
                        </h3>
                        <p className="text-muted-foreground">
                          Com base nos seus dados e benchmarks do nicho de{' '}
                          <span className="font-semibold text-primary">
                            {form.getValues('niche')}
                          </span>
                          .
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
                              <Target className="h-5 w-5" /> Tempo até a Meta
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-4xl font-bold text-foreground">
                              {results.months} meses
                            </p>
                            <p className="text-muted-foreground">
                              Data prevista:{' '}
                              {results.goalDate.toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
                              <Sparkles className="h-5 w-5" /> Potencial de
                              Ganhos/mês
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xl font-bold text-foreground">
                              {formatCurrency(results.currentEarnings[0])} -{' '}
                              {formatCurrency(results.currentEarnings[1])}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                (agora)
                              </span>
                            </p>
                            <p className="text-xl font-bold text-foreground mt-1">
                              {formatCurrency(results.goalEarnings[0])} -{' '}
                              {formatCurrency(results.goalEarnings[1])}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                (na meta)
                              </span>
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-center mb-4">
                          Curva de Crescimento de Seguidores
                        </h4>
                        <div className="h-64 w-full">
                          <ResponsiveContainer>
                            <AreaChart data={results.growthData}>
                              <defs>
                                <linearGradient
                                  id="colorFollowers"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="month"
                                tickFormatter={(v) => `Mês ${v}`}
                              />
                              <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="followers"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorFollowers)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-lg text-center mb-4">
                          Seu Plano Inicial
                        </h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                          <Card className="bg-card">
                            <CardContent className="p-4">
                              <p className="text-sm text-muted-foreground">
                                Plano da Semana
                              </p>
                              <p className="text-lg font-bold">
                                {Math.round(results.reelsPerMonth / 4)} Reels
                              </p>
                            </CardContent>
                          </Card>
                          {results.trendSuggestions.map(
                            (sug: any, index: number) => (
                              <Card key={index} className="bg-card">
                                <CardContent className="p-4">
                                  <p className="text-sm text-muted-foreground">
                                    Gancho Sugerido
                                  </p>
                                  <p className="text-base font-semibold">
                                    {sug.icon} {sug.hook}
                                  </p>
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Button
                          size="lg"
                          className="w-full sm:w-auto h-12 text-base"
                          asChild
                        >
                          <Link href="/sign-up">
                            Criar conta e acelerar
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setStep(0)}
                          className="w-full sm:w-auto"
                        >
                          Recalcular
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Estimativas com base em benchmarks do nicho. Resultados
                        variam por conteúdo, mercado e consistência.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="precos" className="py-20 sm:py-24 bg-muted/30">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Planos para cada fase da sua jornada
              </h2>
              <p className="text-lg text-muted-foreground">
                Comece de graça e faça o upgrade quando estiver pronto para monetizar e profissionalizar.
              </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
               {/* Plano Grátis */}
              <Card className="rounded-2xl p-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold font-headline mb-2">
                  Grátis
                </h3>
                <p className="text-muted-foreground mb-6 flex-grow">
                  Para quem está começando e quer testar a plataforma.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$0{' '}
                  <span className="text-lg font-normal text-muted-foreground">
                    /para sempre
                  </span>
                </p>
                 <ul className="mb-8 space-y-3 text-sm text-muted-foreground">
                   <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Gerador de ideias de vídeo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Até 5 planejamentos semanais</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-11 text-base mt-auto"
                  asChild
                >
                  <Link href="/sign-up">Começar no Grátis</Link>
                </Button>
              </Card>

              {/* Plano Pro */}
              <Card className="rounded-2xl p-6 border-2 border-primary shadow-2xl shadow-primary/20 relative flex flex-col h-full">
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2">
                  Mais Popular
                </Badge>
                <h3 className="text-2xl font-bold font-headline mb-2">Pro</h3>
                <p className="text-muted-foreground mb-6 flex-grow">
                  Para criadores que levam o crescimento a sério e querem otimizar seu conteúdo.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$49{' '}
                  <span className="text-lg font-normal text-muted-foreground">
                    /mês
                  </span>
                </p>
                 <ul className="mb-8 space-y-3 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className='font-semibold'>Tudo do plano Grátis, e mais:</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Gerações de IA **ilimitadas**</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Planejamento de conteúdo semanal</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Calendário de publicações</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Análise de performance de vídeos</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Suporte via e-mail</span>
                    </li>
                </ul>
                <Button className="w-full h-11 text-base font-bold mt-auto" asChild>
                  <Link href="/subscribe?plan=pro">Assinar o Pro</Link>
                </Button>
              </Card>

              {/* Plano Premium */}
               <Card className="rounded-2xl p-6 border border-yellow-400/50 bg-yellow-400/5 flex flex-col h-full">
                 <h3 className="text-2xl font-bold font-headline mb-2 flex items-center gap-2">
                  Premium
                  <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </h3>
                <p className="text-muted-foreground mb-6 flex-grow">
                  Acesso total para criadores que querem monetizar e profissionalizar sua carreira.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$99{' '}
                  <span className="text-lg font-normal text-muted-foreground">
                    /mês
                  </span>
                </p>
                 <ul className="mb-8 space-y-3 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className='font-semibold'>Tudo do plano Pro, e mais:</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Assistente de propostas para Publis</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Gerador de Mídia Kit profissional</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Acesso antecipado a novas ferramentas</span>
                    </li>
                     <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Suporte prioritário via WhatsApp</span>
                    </li>
                </ul>
                <Button className="w-full h-11 text-base font-bold bg-yellow-500 hover:bg-yellow-500/90 text-black mt-auto" asChild>
                  <Link href="/subscribe?plan=premium">Assinar o Premium</Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 sm:py-24">
          <div className="container max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-lg text-muted-foreground">
                Respostas rápidas para as dúvidas mais comuns.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem value={item.question} key={item.question}>
                  <AccordionTrigger className="text-lg font-semibold text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 sm:py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, amount: 0.5 }}
              className="bg-primary/5 p-8 sm:p-12 rounded-2xl"
            >
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Pronto para crescer?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Crie sua conta grátis e transforme seu conteúdo com o poder da
                inteligência artificial.
              </p>
              <Button
                size="lg"
                className="h-12 text-base px-8 font-bold"
                asChild
              >
                <Link href="/sign-up">Começar grátis agora</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} trendify. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
