'use client';

import {
  ArrowRight,
  TrendingUp,
  Target,
  DollarSign,
  Info,
  ChevronDown,
  Sparkles,
  CheckCircle,
  Lightbulb,
  BarChart,
  BrainCircuit,
  Award,
  Zap,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useUser } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  niche: z.string().min(1, 'Selecione um nicho.'),
  country: z.string().min(1, 'Selecione um país.'),
  currentFollowers: z.coerce
    .number()
    .min(1, 'Deve ser maior que zero.')
    .default(10000),
  targetFollowers: z.coerce
    .number()
    .min(1, 'Deve ser maior que zero.')
    .default(100000),
  reelsPerMonth: z.number().min(0).max(60).default(20),
  priority: z
    .enum(['alcance', 'conversao', 'autoridade'])
    .default('alcance'),
});

type FormData = z.infer<typeof formSchema>;

const nicheBenchmarks = {
  moda: { baseGrowth: 0.06, cpm: [20, 80] },
  beleza: { baseGrowth: 0.05, cpm: [25, 90] },
  fitness: { baseGrowth: 0.07, cpm: [30, 100] },
  culinaria: { baseGrowth: 0.055, cpm: [15, 70] },
  lifestyle: { baseGrowth: 0.065, cpm: [18, 75] },
  tecnologia: { baseGrowth: 0.04, cpm: [40, 150] },
};

const priorityWeights = {
  alcance: 1.2,
  conversao: 0.9,
  autoridade: 1.0,
};

const benefits = [
  {
    icon: BrainCircuit,
    title: 'Diagnóstico Inteligente',
    description: 'Nossa IA analisa seu perfil e sugere os melhores caminhos para o seu crescimento.',
  },
  {
    icon: Lightbulb,
    title: 'Ideias de Vídeo Infinitas',
    description: 'Receba roteiros, ganchos e músicas em alta para criar conteúdo viral sem esforço.',
  },
  {
    icon: Award,
    title: 'Mídia Kit Profissional',
    description: 'Gere um mídia kit e propostas que impressionam para fechar parcerias com grandes marcas.',
  },
  {
    icon: BarChart,
    title: 'Previsão de Crescimento',
    description: 'Entenda seu potencial de ganhos e projete quando você atingirá suas metas de seguidores.',
  },
];

const testimonials = [
    {
        name: 'Julia S.',
        handle: '@juliastyle',
        quote: 'A Trendify mudou meu jogo. Dobrei meu engajamento em 3 meses com as ideias da IA.',
        avatar: 'https://picsum.photos/seed/1/100/100',
    },
    {
        name: 'Marcos F.',
        handle: '@fitmarcos',
        quote: 'Finalmente consegui organizar meu conteúdo e fechei minha primeira grande parceria usando o gerador de propostas.',
        avatar: 'https://picsum.photos/seed/2/100/100',
    },
    {
        name: 'Ana C.',
        handle: '@cozinhadaana',
        quote: 'Deixei de perder horas pensando no que postar. A IA me dá roteiros prontos que funcionam.',
        avatar: 'https://picsum.photos/seed/3/100/100',
    }
]

const faqItems = [
  {
    question: 'Para quem é a Trendify?',
    answer: 'A Trendify é para criadores de conteúdo, influenciadores e marcas que desejam crescer de forma estratégica no Instagram e TikTok, otimizando a produção de conteúdo com IA.'
  },
  {
    question: 'Como a IA funciona?',
    answer: 'Nossa IA é treinada com milhões de vídeos virais. Ela analisa seu nicho e objetivos para gerar roteiros, ganchos, legendas e estratégias de conteúdo personalizadas para o seu perfil.'
  },
  {
    question: 'O plano gratuito é limitado?',
    answer: 'O plano gratuito oferece acesso limitado às nossas ferramentas de IA e funcionalidades. O plano Pro desbloqueia todo o potencial da plataforma, com gerações ilimitadas e recursos avançados.'
  },
   {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Você pode cancelar sua assinatura do plano Pro a qualquer momento, sem taxas ou burocracia. Você manterá o acesso aos recursos Pro até o final do seu ciclo de faturamento.'
  }
]


export default function LandingPage() {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: 'moda',
      country: 'br',
      currentFollowers: 10000,
      targetFollowers: 100000,
      reelsPerMonth: 20,
      priority: 'alcance',
    },
  });

  const onSubmit = (data: FormData) => {
    setIsCalculating(true);
    setTimeout(() => {
      const benchmark =
        nicheBenchmarks[data.niche as keyof typeof nicheBenchmarks];
      const priorityWeight = priorityWeights[data.priority];

      const reelsMultiplier = 1 + (data.reelsPerMonth - 10) * 0.02;
      const monthlyGrowthRate =
        benchmark.baseGrowth * reelsMultiplier * priorityWeight;

      let months = 0;
      let followers = data.currentFollowers;
      const growthData = [{ month: 0, followers: Math.round(followers) }];
      while (followers < data.targetFollowers) {
        followers *= 1 + monthlyGrowthRate;
        months++;
        growthData.push({ month: months, followers: Math.round(followers) });
        if (months > 240) break; // safety break
      }

      const viewRate = [0.2, 0.5];
      const cpm = benchmark.cpm;
      const publisPerMonth = Math.round(data.reelsPerMonth * 0.25);

      const calculateEarnings = (followerCount: number) => {
        const views = [
          followerCount * viewRate[0],
          followerCount * viewRate[1],
        ];
        const pricePerReel = [
          (views[0] / 1000) * cpm[0],
          (views[1] / 1000) * cpm[1],
        ];
        const monthlyEarnings = [
          pricePerReel[0] * publisPerMonth,
          pricePerReel[1] * publisPerMonth,
        ];
        return monthlyEarnings.map((v) => Math.round(v));
      };

      const currentEarnings = calculateEarnings(data.currentFollowers);
      const targetEarnings = calculateEarnings(data.targetFollowers);

      const targetDate = format(addMonths(new Date(), months), "MMMM 'de' yyyy");

      const trendSuggestions = {
        moda: [
          '3 looks com uma peça só',
          'GRWM para um evento X',
          'Review honesto da marca Y',
        ],
        beleza: [
          'Tutorial de make para iniciantes',
          'Minha rotina de skincare noturna',
          'Produtos que eu compraria de novo',
        ],
        fitness: [
          'Meu treino de pernas completo',
          'O que eu como em um dia',
          '3 exercícios para fazer em casa',
        ],
        culinaria: [
          'Receita fácil para o jantar',
          'Como fazer o café perfeito',
          'Review do restaurante da moda',
        ],
        lifestyle: [
          'Um dia na minha vida',
          'Tour pelo meu apartamento',
          '5 hábitos que mudaram minha vida',
        ],
        tecnologia: [
          'Unboxing do novo iPhone',
          'Top 5 apps que você precisa ter',
          'Como otimizar seu home office',
        ],
      };

      setResults({
        monthsToTarget: months,
        targetDate,
        currentEarnings,
        targetEarnings,
        growthData,
        recommendedPlan: `Poste ${data.reelsPerMonth} Reels por mês para otimizar o crescimento.`,
        trendSuggestions:
          trendSuggestions[data.niche as keyof typeof trendSuggestions],
      });
      setIsCalculating(false);
      setStep(4);
    }, 1500);
  };

  const currentFollowers = form.watch('currentFollowers');
  const targetFollowers = form.watch('targetFollowers');

  useEffect(() => {
    if (targetFollowers <= currentFollowers) {
      form.setError('targetFollowers', {
        type: 'manual',
        message: 'A meta deve ser maior que os seguidores atuais.',
      });
    } else {
      form.clearErrors('targetFollowers');
    }
  }, [currentFollowers, targetFollowers, form]);

  const renderStep = () => {
    const motionProps = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.4, ease: 'easeInOut' },
    };

    switch (step) {
      case 1:
        return (
          <motion.div {...motionProps} key="step1">
            <h3 className="font-semibold text-lg text-foreground mb-1">
              Passo 1 de 3
            </h3>
            <p className="text-muted-foreground mb-6">
              Nos conte sobre sua conta e nicho.
            </p>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="niche"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu Nicho Principal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu nicho..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="moda">Moda</SelectItem>
                        <SelectItem value="beleza">Beleza</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="culinaria">Culinária</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="tecnologia">Tecnologia</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País/Região</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu país..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="br">Brasil</SelectItem>
                        <SelectItem value="us">Estados Unidos</SelectItem>
                        <SelectItem value="pt">Portugal</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div {...motionProps} key="step2">
            <h3 className="font-semibold text-lg text-foreground mb-1">
              Passo 2 de 3
            </h3>
            <p className="text-muted-foreground mb-6">
              Qual seu ponto de partida?
            </p>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="currentFollowers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seguidores Atuais</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetFollowers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta de Seguidores</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div {...motionProps} key="step3">
            <h3 className="font-semibold text-lg text-foreground mb-1">
              Passo 3 de 3
            </h3>
            <p className="text-muted-foreground mb-6">
              Defina sua meta e cadência.
            </p>
            <div className="space-y-8">
              <FormField
                control={form.control}
                name="reelsPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Reels por Mês</FormLabel>
                      <span className="text-sm font-semibold text-primary">
                        {field.value}
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={60}
                        step={1}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual sua prioridade?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua prioridade..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="alcance">
                          Alcance (Crescer mais rápido)
                        </SelectItem>
                        <SelectItem value="conversao">
                          Conversão (Vender mais)
                        </SelectItem>
                        <SelectItem value="autoridade">
                          Autoridade (Construir marca)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const ResultCard = ({
    icon,
    title,
    value,
    description,
    delay,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    value?: string;
    description?: string;
    delay: number;
    children?: React.ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/20 shadow-lg shadow-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {value && (
            <div className="text-3xl font-bold font-headline text-foreground">
              {value}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container flex h-20 items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold font-headline tracking-tighter text-foreground"
          >
            trendify
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants({
                  className: 'font-manrope rounded-full',
                })}
              >
                Acessar Painel
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hidden sm:block"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className={buttonVariants({
                    className: 'font-manrope rounded-full',
                  })}
                >
                  Comece Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="py-24 sm:py-32 text-center">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4 !leading-tight max-w-3xl mx-auto">
                Menos achismo, mais crescimento.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Use IA para transformar sua criação de conteúdo. Receba roteiros,
                analise métricas e acelere seu potencial.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'font-manrope rounded-full text-base h-12 px-8 shadow-lg shadow-primary/20'
                  )}
                >
                  Comece Grátis
                </Link>
                <Link
                  href="#calculator"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'font-manrope rounded-full text-base h-12 px-8'
                  )}
                >
                  Ver como funciona
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Plano gratuito. Não precisa de cartão de crédito.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container py-12 md:py-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-center p-4">
                  <div className="bg-primary/10 text-primary h-12 w-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-headline text-xl font-bold">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Product Section */}
        <section className="py-12 md:py-24">
            <div className="container text-center max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">O fim do bloqueio criativo.</h2>
                <p className="text-lg text-muted-foreground mt-4">A Trendify é sua parceira de estratégia. Nossa IA analisa o que funciona no seu nicho e entrega um plano de ação claro, de roteiros virais a propostas para marcas. É o seu foco na criação, e o nosso na inteligência.</p>
            </div>
        </section>
        
        {/* Social Proof */}
        <section className="py-12 md:py-24">
            <div className="container">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">Junte-se a criadores que estão acelerando</h2>
                    <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">Resultados reais de quem usa a Trendify para crescer.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                             initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                        >
                            <Card className="h-full flex flex-col justify-between bg-card/80 backdrop-blur-sm border-border/20 shadow-lg shadow-primary/5">
                                <CardContent className="pt-6">
                                    <p className="text-foreground">"{testimonial.quote}"</p>
                                </CardContent>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <img src={testimonial.avatar} alt={testimonial.name} className="h-10 w-10 rounded-full" />
                                        <div>
                                            <p className="font-bold text-foreground">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.handle}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        {/* Why Trendify Section */}
         <section className="container py-12 md:py-24">
           <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">Por que a Trendify?</h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">Foco, estratégia e inteligência. Tudo em um só lugar.</p>
          </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">Produtividade Acelerada</h3>
                        <p className="text-muted-foreground">Passe menos tempo planejando e mais tempo criando com roteiros e ideias gerados por IA.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">Crescimento Estratégico</h3>
                        <p className="text-muted-foreground">Tome decisões baseadas em dados e nas melhores práticas para o seu nicho específico.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">Monetização Inteligente</h3>
                        <p className="text-muted-foreground">Calcule preços, gere propostas e feche parcerias com as ferramentas certas para profissionalizar seu trabalho.</p>
                    </div>
                </div>
            </div>
        </section>


        {/* Calculator Section */}
        <section id="calculator" className="container py-12 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">
              Projete seu crescimento. Veja seu potencial.
            </h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">
              Responda 6 perguntas. Em 60 segundos mostramos seu plano, tempo
              até a meta e potencial de ganhos no seu nicho.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-lg mx-auto w-full">
              <Card className="bg-card/30 backdrop-blur-lg border border-border/10 rounded-2xl shadow-2xl shadow-primary/5">
                <CardContent className="p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <AnimatePresence mode="wait">
                        {renderStep()}
                      </AnimatePresence>
                      <div className="flex justify-between items-center mt-8">
                        {step > 1 && step < 4 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setStep(step - 1)}
                          >
                            Voltar
                          </Button>
                        )}
                        <div className="flex-1" />
                        {step < 3 && (
                          <Button
                            type="button"
                            onClick={() => setStep(step + 1)}
                          >
                            Próximo
                          </Button>
                        )}
                        {step === 3 && (
                          <Button
                            type="submit"
                            disabled={isCalculating}
                            className="w-full sm:w-auto"
                          >
                            {isCalculating ? (
                              'Calculando...'
                            ) : (
                              <>
                                Ver minha projeção{' '}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="relative min-h-[600px] rounded-3xl p-8 flex flex-col justify-center items-center text-center bg-muted/20 border border-dashed border-border/30">
              <AnimatePresence>
                {!results && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold font-headline text-foreground">
                      Sua projeção aparecerá aqui
                    </h3>
                    <p className="text-muted-foreground">
                      Preencha os dados ao lado para começar.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full space-y-6"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <ResultCard
                      icon={<Target className="h-4 w-4 text-muted-foreground" />}
                      title="Tempo até a Meta"
                      value={`${results.monthsToTarget} meses`}
                      description={`Data prevista: ${results.targetDate}`}
                      delay={0.1}
                    />
                    <ResultCard
                      icon={
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      }
                      title="Ganhos/mês (Meta)"
                      value={`R$${(results.targetEarnings[0] / 1000).toFixed(
                        1
                      )}k - R$${(results.targetEarnings[1] / 1000).toFixed(
                        1
                      )}k`}
                      description={`Agora: R$${results.currentEarnings[0]} - R$${results.currentEarnings[1]}`}
                      delay={0.2}
                    />
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card className="bg-card/50 backdrop-blur-sm border-border/20 shadow-lg shadow-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base font-medium flex items-center justify-between">
                          <span>Curva de Crescimento</span>
                          <TooltipProvider>
                            <ShadTooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Estimativa de crescimento de seguidores.</p>
                              </TooltipContent>
                            </ShadTooltip>
                          </TooltipProvider>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={results.growthData}
                            margin={{
                              top: 5,
                              right: 20,
                              left: 0,
                              bottom: 5,
                            }}
                          >
                            <XAxis
                              dataKey="month"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `Mês ${value}`}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) =>
                                `${(value / 1000).toLocaleString()}k`
                              }
                            />
                            <RechartsTooltip
                              contentStyle={{
                                background: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                              }}
                              labelFormatter={(value) => `Mês ${value}`}
                              formatter={(value: number) => [
                                `${Number(value).toLocaleString()} seguidores`,
                                'Projeção',
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="followers"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <ResultCard
                      icon={
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      }
                      title="Sugestões para seu Nicho"
                      delay={0.4}
                    >
                      <ul className="text-left text-sm text-muted-foreground mt-4 space-y-2">
                        {results.trendSuggestions.map(
                          (suggestion: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span>{suggestion}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </ResultCard>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-center pt-4"
                  >
                    <Link
                      href="/sign-up"
                      className={buttonVariants({
                        size: 'lg',
                        className:
                          'font-manrope rounded-full text-base h-12 px-8 shadow-lg shadow-primary/20 transition-transform hover:scale-105',
                      })}
                    >
                      Criar conta e seguir o plano{' '}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-3">
                      Estimativas com base em benchmarks do nicho. Resultados
                      variam.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container py-12 md:py-24">
            <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">Um plano para cada etapa</h2>
                <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">Comece de graça. Escale quando estiver pronto.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card className="p-8 flex flex-col bg-card/80 backdrop-blur-sm border-border/20 shadow-lg shadow-primary/5">
                    <h3 className="font-headline text-2xl font-bold">Grátis</h3>
                    <p className="text-muted-foreground mb-6">Para começar a explorar</p>
                    <div className="text-4xl font-black font-headline mb-6">R$0</div>
                    <ul className="space-y-3 mb-8 text-muted-foreground flex-1">
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> 5 Gerações com IA /mês</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Calendário de Conteúdo</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Análise de vídeo (limitado)</li>
                    </ul>
                    <Button variant="outline" className="w-full h-11 text-base font-manrope rounded-lg">Comece Agora</Button>
                </Card>
                <Card className="p-8 flex flex-col bg-card/80 backdrop-blur-sm border-primary/50 border-2 shadow-2xl shadow-primary/10">
                     <div className="flex justify-between items-center">
                        <h3 className="font-headline text-2xl font-bold">Pro</h3>
                        <div className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary text-primary-foreground">Mais Popular</div>
                    </div>
                    <p className="text-muted-foreground mb-6">Para acelerar seu crescimento</p>
                    <div className="mb-6">
                        <span className="text-4xl font-black font-headline">R$49</span>
                        <span className="text-muted-foreground font-medium">/mês</span>
                    </div>
                     <ul className="space-y-3 mb-8 text-muted-foreground flex-1">
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Tudo do Grátis, e mais:</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Gerações com IA Ilimitadas</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Mídia Kit e Propostas Pro</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Projeção de Ganhos e Metas</li>
                        <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /> Suporte Prioritário</li>
                    </ul>
                    <Button className="w-full h-11 text-base font-manrope rounded-lg shadow-lg shadow-primary/20">Quero o Plano Pro</Button>
                </Card>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="container py-12 md:py-24">
             <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">Perguntas Frequentes</h2>
            </div>
            <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                         <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger className="text-lg font-bold text-left">{item.question}</AccordionTrigger>
                            <AccordionContent className="text-base text-muted-foreground">
                            {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>


        {/* Final CTA Section */}
        <section className="container py-20 md:py-32 text-center">
          <div className="bg-primary/10 p-10 rounded-2xl">
            <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">
              Pronto para transformar seu conteúdo?
            </h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
              Crie sua conta grátis e junte-se a milhares de criadores que
              estão crescendo de forma mais inteligente.
            </p>
            <div className="mt-8">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'font-manrope rounded-full text-base h-12 px-8 shadow-lg shadow-primary/20 transition-transform hover:scale-105'
                )}
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
