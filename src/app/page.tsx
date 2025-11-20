'use client';

import {
  ArrowRight,
  TrendingUp,
  Target,
  DollarSign,
  Info,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
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
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { addMonths } from 'date-fns';

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

      const reelsMultiplier = 1 + (data.reelsPerMonth - 10) * 0.02; // +2% for each reel above 10
      const monthlyGrowthRate =
        benchmark.baseGrowth * reelsMultiplier * priorityWeight;

      let months = 0;
      let followers = data.currentFollowers;
      const growthData = [{ month: 0, followers: Math.round(followers) }];
      while (followers < data.targetFollowers) {
        followers *= 1 + monthlyGrowthRate;
        months++;
        growthData.push({ month: months, followers: Math.round(followers) });
      }

      const viewRate = [0.2, 0.5]; // 20-50%
      const cpm = benchmark.cpm;
      const publisPerMonth = Math.round(data.reelsPerMonth * 0.25); // 25% of reels are publis

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
    }, 1500); // Simulate calculation delay
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
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground hidden sm:block"
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
        <section className="container py-12 md:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Formulário */}
            <div className="max-w-lg">
              <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tighter mb-4 !leading-tight">
                Se veja no futuro.
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Responda 6 perguntas. Em 60 segundos mostramos seu plano, tempo
                até a meta e potencial de ganhos no seu nicho.
              </p>
              <Card className="bg-card/30 backdrop-blur-lg border border-border/10 rounded-2xl shadow-2xl shadow-primary/5">
                <CardContent className="p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <AnimatePresence mode="wait">
                        {renderStep()}
                      </AnimatePresence>
                      <div className="flex justify-between items-center mt-8">
                        {step > 1 && step < 4 && (
                          <button
                            type="button"
                            className={buttonVariants({variant: 'ghost'})}
                            onClick={() => setStep(step - 1)}
                          >
                            Voltar
                          </button>
                        )}
                        <div className="flex-1" />
                        {step < 3 && (
                          <button
                            type="button"
                            className={buttonVariants()}
                            onClick={() => setStep(step + 1)}
                          >
                            Próximo
                          </button>
                        )}
                        {step === 3 && (
                          <button
                            type="submit"
                            disabled={isCalculating}
                            className={buttonVariants({className: "w-full sm:w-auto"})}
                          >
                            {isCalculating ? (
                              'Calculando...'
                            ) : (
                              <>
                                Ver minha projeção{' '}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Resultados */}
            <div className="relative h-[600px] rounded-3xl p-8 flex flex-col justify-center items-center text-center bg-muted/20 border border-dashed border-border/30">
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
                            <Tooltip
                              contentStyle={{
                                background: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                              }}
                              labelFormatter={(value) => `Mês ${value}`}
                              formatter={(value) => [
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
                      icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                      title="Sugestões para seu Nicho"
                      delay={0.4}
                    >
                      <ul className="text-left text-sm text-muted-foreground mt-4 space-y-2">
                        {results.trendSuggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
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
                        className: 'font-manrope rounded-full text-base h-12 px-8 shadow-lg shadow-primary/20 transition-transform hover:scale-105',
                      })}
                    >
                      Criar conta e seguir o plano{' '}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                     <p className="text-xs text-muted-foreground mt-3">
                      Estimativas com base em benchmarks do nicho. Resultados variam.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
