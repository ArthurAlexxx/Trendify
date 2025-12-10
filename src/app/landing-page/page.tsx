
'use client';

import {
  ArrowUpRight,
  Briefcase,
  Lightbulb,
  LineChart,
  Sparkles,
  Target,
  Video,
  Check,
  Loader2,
  Crown,
  Menu,
  X,
  ClipboardList,
  BrainCircuit,
  Rocket,
  BarChart as BarChartIcon,
  AlertTriangle,
  DollarSign,
  Users,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { AnimatedHero } from '@/components/ui/animated-hero';
import { useScroll } from '@/hooks/use-scroll';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  GrowthCalculatorOutput,
  calculateGrowthAction,
} from '@/app/landing-page/actions';
import { useResponsiveToast } from '@/hooks/use-responsive-toast';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

const features = [
  {
    icon: ClipboardList,
    title: 'Planejamento Estratégico',
    description: 'Receba planos de conteúdo semanais e roteiros completos, alinhados aos seus objetivos para maximizar seu crescimento.',
    plan: 'pro'
  },
  {
    icon: Lightbulb,
    title: 'Ideias e Roteiros Virais',
    description: 'Transforme qualquer tema em um roteiro de vídeo otimizado para viralizar, com ganchos magnéticos e CTAs eficazes.',
    plan: 'pro'
  },
  {
    icon: Video,
    title: 'Diagnóstico de Vídeo',
    description: 'Faça upload de um vídeo e receba uma análise detalhada sobre seu potencial de viralização e um checklist de melhorias.',
    plan: 'pro'
  },
  {
    icon: Briefcase,
    title: 'Prospecção de Marcas',
    description: 'Gere um pacote de prospecção com Mídia Kit, tabela de preços e ideias de conteúdo para apresentar a marcas.',
    plan: 'premium'
  },
  {
    icon: DollarSign,
    title: 'Assistente de Publis',
    description: 'Crie roteiros e estratégias de conteúdo patrocinado (publis) que sejam autênticos e que convertam.',
    plan: 'premium'
  }
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
      'Sim! Nossa plataforma é treinada para se adaptar a dezenas de nichos, de beleza e fitness a tecnologia e finanças. As sugestões são personalizadas para o seu público.',
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento, sem burocracia. Você manterá o acesso aos recursos do seu plano até o final do período de faturamento.',
  },
];

const calculatorSchema = z.object({
  niche: z.string().min(3, 'O nicho deve ter pelo menos 3 caracteres.'),
  followers: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'O número de seguidores é muito alto.'),
  goal: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'A meta de seguidores é muito alta.'),
  postsPerMonth: z.number().min(0),
});

type CalculatorInput = z.infer<typeof calculatorSchema>;

const WordmarkIcon = (props: React.ComponentProps<'a'>) => (
  <Link
    href="/"
    className="flex items-center gap-2 text-xl font-bold font-headline tracking-tighter text-foreground"
    {...props}
  >
    <div className="bg-foreground text-background h-7 w-7 flex items-center justify-center rounded-full">
      <ArrowUpRight className="h-4 w-4" />
    </div>
    trendify
  </Link>
);


export default function LandingPage() {
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolled = useScroll(10);
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<GrowthCalculatorOutput | null>(null);
  const [step, setStep] = useState(0); // 0: form, 1: results
  const { toast } = useResponsiveToast();

  const navLinks = [
      { href: '#beneficios', text: 'Benefícios' },
      { href: '#calculadora', text: 'Calculadora' },
      { href: '#precos', text: 'Preços' },
      { href: '#faq', text: 'FAQ' },
  ];

  const form = useForm<CalculatorInput>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      niche: '',
      followers: 10000,
      goal: 100000,
      postsPerMonth: 20,
    },
  });

  const handleCalculate = async (data: CalculatorInput) => {
    setIsCalculating(true);
    setResults(null);
    try {
      const result = await calculateGrowthAction(null, data);
      if (result.error) {
        toast({ title: "Erro ao Calcular", description: result.error, variant: 'destructive'});
        setIsCalculating(false);
      } else if (result.data) {
        setResults(result.data);
        setStep(1); // Move to results view
      }
    } catch (e) {
      toast({ title: "Erro Inesperado", description: "Ocorreu um erro. Tente novamente.", variant: 'destructive'});
    } finally {
      setIsCalculating(false);
    }
  }


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      	<header
			className={cn(
				'sticky top-0 z-50 w-full border-b backdrop-blur-lg transition-all ease-out h-20',
        'bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border/50'
			)}
		>
			<nav
				className={cn(
					'container flex w-full items-center justify-between transition-all duration-300 h-20'
				)}
			>
				<div className="flex-1 justify-start">
                    <WordmarkIcon onClick={() => setIsMenuOpen(false)} />
                </div>

				<div className="hidden items-center justify-center gap-2 md:flex flex-1">
					{navLinks.map((link) => (
						<a key={link.href} className={buttonVariants({ variant: 'ghost' })} href={link.href}>
							{link.text}
						</a>
					))}
                </div>

                <div className="hidden items-center justify-end gap-2 md:flex flex-1">
                  {user ? (
                      <Link
                        href="/dashboard"
                         className={cn(
                            buttonVariants({ size: 'default' }),
                            'font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground shadow-lg shadow-indigo-500/50 hover:opacity-90 transition-opacity'
                        )}
                      >
                        Painel
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className={buttonVariants({
                            variant: 'ghost',
                          })}
                        >
                          Entrar
                        </Link>
                        <Link
                          href="/sign-up"
                          className={cn(
                            buttonVariants({}),
                            'font-semibold rounded-lg'
                          )}
                        >
                          Começar Grátis
                        </Link>
                      </>
                    )}
				</div>
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="outline" className="md:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-2 px-6 h-20 border-b">
                                 <WordmarkIcon onClick={() => setIsMenuOpen(false)}/>
                            </div>
                            <nav className="flex-1 px-4 py-4">
                                <ul className="space-y-1">
                                    {navLinks.map((link) => (
                                       <li key={link.href}>
                                        <a
                                            className={cn(buttonVariants({
                                                variant: 'ghost',
                                            }), 'w-full justify-start h-12 text-base')}
                                            href={link.href}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {link.text}
                                        </a>
                                       </li>
                                    ))}
                                </ul>
                            </nav>
                           
                            <div className="mt-auto p-4 border-t space-y-2">
                            {user ? (
                                <Button asChild variant="secondary" size="lg" className="w-full text-base h-12 font-semibold">
                                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>Acessar Painel</Link>
                                </Button>
                            ) : (
                            <>
                              <Button asChild variant="secondary" size="lg" className="w-full text-base h-12 font-semibold">
                                <Link href="/login" onClick={() => setIsMenuOpen(false)}>Entrar</Link>
                              </Button>
                              <Button asChild size="lg" className="w-full text-base h-12 font-semibold">
                                <Link href="/sign-up" onClick={() => setIsMenuOpen(false)}>Começar Grátis</Link>
                              </Button>
                            </>
                            )}
					        </div>
                        </div>
                    </SheetContent>
                </Sheet>
			</nav>
		</header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
           <AnimatedHero />
        </section>

        {/* Unified Benefits Section */}
        <section id="beneficios" className="py-20 sm:py-24">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight mb-4">
              A plataforma completa para criadores
            </h2>
            <p className="text-base text-muted-foreground mb-12 max-w-2xl mx-auto">
              Da estratégia de conteúdo à monetização, a Trendify centraliza tudo que você precisa para crescer de forma inteligente.
            </p>
            {/* Mobile Carousel */}
            <div className="lg:hidden">
                <Carousel className="w-full" opts={{ align: "start" }}>
                  <CarouselContent className="-ml-4">
                    {features.map((feature, index) => (
                      <CarouselItem key={feature.title} className="pl-4 basis-[90%] md:basis-1/2">
                         <motion.div 
                            className="p-1 h-full"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                         >
                          <Card className="text-left h-full bg-card/50 rounded-2xl border shadow-primary-lg p-6">
                            <div className='flex flex-col h-full'>
                              <div className='flex items-center justify-between mb-4'>
                                <div className="bg-primary/10 text-primary p-3 rounded-lg">
                                  <feature.icon className="h-6 w-6" />
                                </div>
                                {feature.plan && (
                                  <Badge variant={feature.plan === 'premium' ? 'default' : 'secondary'} className={cn(feature.plan === 'premium' && 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30')}>
                                    {feature.plan === 'premium' ? 'Premium' : 'Pro'}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-base mb-2 text-foreground">
                                {feature.title}
                              </h3>
                              <p className="text-sm text-muted-foreground flex-grow">
                                {feature.description}
                              </p>
                            </div>
                          </Card>
                         </motion.div>
                    </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
            </div>
            {/* Desktop Grid */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {features.slice(0, 3).map((feature) => (
                  <motion.div
                    key={feature.title}
                    whileHover={{ scale: 1.03, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-full"
                  >
                    <Card className="text-left h-full bg-card/50 rounded-2xl shadow-primary-lg p-6 flex flex-col">
                      <div className='flex items-center justify-between mb-4'>
                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                          <feature.icon className="h-6 w-6" />
                        </div>
                        {feature.plan && (
                          <Badge variant={feature.plan === 'premium' ? 'default' : 'secondary'} className={cn(feature.plan === 'premium' && 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30')}>
                            {feature.plan === 'premium' ? 'Premium' : 'Pro'}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-base mb-2 text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground flex-grow">
                        {feature.description}
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full lg:w-2/3">
                    {features.slice(3).map((feature) => (
                    <motion.div
                        key={feature.title}
                        whileHover={{ scale: 1.03, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="h-full"
                    >
                        <Card className="text-left h-full bg-card/50 rounded-2xl shadow-primary-lg p-6 flex flex-col">
                        <div className='flex items-center justify-between mb-4'>
                            <div className="bg-primary/10 text-primary p-3 rounded-lg">
                            <feature.icon className="h-6 w-6" />
                            </div>
                            {feature.plan && (
                            <Badge variant={feature.plan === 'premium' ? 'default' : 'secondary'} className={cn(feature.plan === 'premium' && 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30')}>
                                {feature.plan === 'premium' ? 'Premium' : 'Pro'}
                            </Badge>
                            )}
                        </div>
                        <h3 className="font-bold text-base mb-2 text-foreground">
                            {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex-grow">
                            {feature.description}
                        </p>
                        </Card>
                    </motion.div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section id="calculadora" className="py-20 sm:py-24 bg-muted/30">
          <div className="container">
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                      Calcule seu Potencial de Crescimento
                    </h2>
                    <p className="text-base text-muted-foreground">
                      Responda 3 perguntas e, em segundos, mostraremos seu
                      plano de crescimento, tempo até a meta e potencial de ganhos no seu nicho.
                    </p>
                  </div>
                  <Card className="max-w-4xl mx-auto p-4 sm:p-6 rounded-2xl bg-card shadow-primary-lg">
                    <CardContent className="p-2 sm:p-4">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(handleCalculate)}
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
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: Beleza, Finanças"
                                      className="h-11 text-base bg-muted/50"
                                      {...field}
                                    />
                                  </FormControl>
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
                                      type="text"
                                      value={field.value.toLocaleString('pt-BR')}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        const num = parseInt(value, 10);
                                        field.onChange(isNaN(num) ? 0 : num > 50000000 ? 50000000 : num);
                                      }}
                                      className="h-11 text-base bg-muted/50"
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
                                      type="text"
                                      value={field.value.toLocaleString('pt-BR')}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        const num = parseInt(value, 10);
                                        field.onChange(isNaN(num) ? 0 : num > 50000000 ? 50000000 : num);
                                      }}
                                      className="h-11 text-base bg-muted/50"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="postsPerMonth"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-baseline mb-2">
                                  <FormLabel className="font-semibold">
                                    Quantas publicações você faz por mês?
                                  </FormLabel>
                                  <span className="text-lg font-bold text-primary">
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
                            className="w-full h-11 text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground shadow-lg shadow-indigo-500/50 hover:opacity-90 transition-opacity"
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
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {isCalculating && (
                    <div className="flex justify-center items-center h-64 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {results && !isCalculating && (
                    <div className="space-y-6">
                      <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight mb-2">
                          Sua projeção de crescimento está pronta!
                        </h2>
                        <p className="text-base text-muted-foreground">
                          Com base nos seus dados e benchmarks do nicho de{' '}
                          <span className="font-semibold text-primary">
                            {form.getValues('niche')}
                          </span>
                          .
                        </p>
                      </div>
                      
                      {/* Mobile Carousel */}
                      <div className="lg:hidden">
                          <Carousel className="w-full" opts={{ align: "start" }}>
                            <CarouselContent className="-ml-4">
                              {results.growthData && results.growthData.length > 0 && (
                                <CarouselItem className="pl-4 basis-[90%] pb-8">
                                  <div className="p-1 h-full">
                                  <Card className="rounded-2xl border shadow-primary-lg">
                                    <CardHeader className="p-4"><CardTitle className="text-sm font-bold">Curva de Crescimento</CardTitle></CardHeader>
                                    <CardContent className="p-2 pl-0">
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer>
                                                <AreaChart data={results.growthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                    <defs><linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                                                    <XAxis dataKey="month" tickFormatter={(v) => `Mês ${v}`} tick={{fontSize: 10}} />
                                                    <YAxis domain={[0, (dataMax: number) => Math.ceil((Math.max(form.getValues('goal'), dataMax) * 1.1) / 1000) * 1000]} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v.toString()} tick={{fontSize: 10}} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '12px', padding: '4px 8px' }} />
                                                    <Area type="monotone" dataKey="followers" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorFollowers)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                  </Card>
                                  </div>
                                </CarouselItem>
                              )}
                              {(results.currentEarnings || results.goalEarnings) && (
                                <CarouselItem className="pl-4 basis-[90%] pb-8">
                                  <div className="p-1 h-full">
                                  <Card className="h-full rounded-2xl border shadow-primary-lg">
                                    <CardHeader className="p-4">
                                      <CardTitle className="text-sm font-bold">
                                        Potencial de Ganhos/Mês
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-center p-4">
                                      {results.currentEarnings && (
                                        <div>
                                          <p className="text-lg font-bold">
                                            {formatCurrency(results.currentEarnings[0])} - {formatCurrency(results.currentEarnings[1])}
                                          </p>
                                          <p className="text-xs text-muted-foreground">(estimativa atual)</p>
                                        </div>
                                      )}
                                      {results.goalEarnings && (
                                         <div>
                                          <p className="text-lg font-bold">
                                            {formatCurrency(results.goalEarnings[0])} - {formatCurrency(results.goalEarnings[1])}
                                          </p>
                                          <p className="text-xs text-muted-foreground">(estimativa na meta)</p>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                  </div>
                                </CarouselItem>
                              )}
                               {results.accelerationScenarios && (
                                <CarouselItem className="pl-4 basis-[90%] pb-8">
                                   <div className="p-1 h-full">
                                  <Card className="rounded-2xl h-full border shadow-primary-lg">
                                    <CardHeader className="p-4"><CardTitle className="text-sm font-bold">Cenários de Aceleração</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-3 gap-2 text-center p-4">
                                        <div><p className="font-bold text-lg">{results.accelerationScenarios.maintain}</p><p className="text-xs text-muted-foreground">Meses (Ritmo Atual)</p></div>
                                        <div><p className="font-bold text-lg">{results.accelerationScenarios.plus20}</p><p className="text-xs text-muted-foreground">Meses (+20% Posts)</p></div>
                                        <div><p className="font-bold text-lg">{results.accelerationScenarios.plus40}</p><p className="text-xs text-muted-foreground">Meses (+40% Posts)</p></div>
                                    </CardContent>
                                  </Card>
                                  </div>
                                </CarouselItem>
                              )}
                            </CarouselContent>
                          </Carousel>
                      </div>

                      {/* Desktop Grid */}
                      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                          {/* Left Column */}
                          <div className="space-y-6">
                              {results.growthData && results.growthData.length > 0 && (
                              <Card className="rounded-2xl border shadow-primary-lg">
                                  <CardHeader className="p-4"><CardTitle className="text-sm font-bold">Curva de Crescimento</CardTitle></CardHeader>
                                  <CardContent className="p-2 pl-0">
                                      <div className="h-[220px] w-full">
                                          <ResponsiveContainer>
                                              <AreaChart data={results.growthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                  <defs><linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                                                  <XAxis dataKey="month" tickFormatter={(v) => `Mês ${v}`} tick={{fontSize: 10}} />
                                                  <YAxis domain={[0, (dataMax: number) => Math.ceil((Math.max(form.getValues('goal'), dataMax) * 1.1) / 1000) * 1000]} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v.toString()} tick={{fontSize: 10}}/>
                                                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '12px', padding: '4px 8px' }} />
                                                  <Area type="monotone" dataKey="followers" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorFollowers)" />
                                              </AreaChart>
                                          </ResponsiveContainer>
                                      </div>
                                  </CardContent>
                              </Card>
                              )}
                              {results.accelerationScenarios && (
                              <Card className="rounded-2xl border shadow-primary-lg">
                                  <CardHeader className="p-4"><CardTitle className="text-sm font-bold">Cenários de Aceleração</CardTitle></CardHeader>
                                  <CardContent className="grid grid-cols-3 gap-2 text-center p-4">
                                      <div><p className="font-bold text-lg">{results.accelerationScenarios.maintain}</p><p className="text-xs text-muted-foreground">Meses (Ritmo Atual)</p></div>
                                      <div><p className="font-bold text-lg">{results.accelerationScenarios.plus20}</p><p className="text-xs text-muted-foreground">Meses (+20% Posts)</p></div>
                                      <div><p className="font-bold text-lg">{results.accelerationScenarios.plus40}</p><p className="text-xs text-muted-foreground">Meses (+40% Posts)</p></div>
                                  </CardContent>
                              </Card>
                              )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  {results.months != null && (
                                    <Card className="bg-primary/5 border-primary/20 text-center shadow-primary-lg"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tempo até a Meta</p><p className="text-lg font-bold">{results.months} meses</p></CardContent></Card>
                                  )}
                                  {results.difficultyScore && (
                                    <Card className="bg-primary/5 border-primary/20 text-center shadow-primary-lg"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Nível da Meta</p><p className="text-lg font-bold">{results.difficultyScore}</p></CardContent></Card>
                                  )}
                              </div>
                               {(results.currentEarnings || results.goalEarnings) && (
                                <Card className="border shadow-primary-lg">
                                  <CardHeader className="p-4">
                                    <CardTitle className="text-sm font-bold">
                                      Potencial de Ganhos/Mês
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-0">
                                    {results.currentEarnings && (
                                      <p className="text-base font-semibold">
                                        {formatCurrency(results.currentEarnings[0])} -{' '}
                                        {formatCurrency(results.currentEarnings[1])}
                                        <span className="text-xs font-normal text-muted-foreground ml-2">
                                          (agora)
                                        </span>
                                      </p>
                                    )}
                                    {results.goalEarnings && (
                                      <p className="text-base font-semibold mt-1">
                                        {formatCurrency(results.goalEarnings[0])} -{' '}
                                        {formatCurrency(results.goalEarnings[1])}
                                        <span className="text-xs font-normal text-muted-foreground ml-2">
                                          (na meta)
                                        </span>
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                              {results.benchmarkComparison && (
                                <Card className="border shadow-primary-lg"><CardHeader className="p-4"><CardTitle className="text-sm font-bold">Análise do Mercado</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-sm text-muted-foreground">{results.benchmarkComparison}</p></CardContent></Card>
                              )}
                          </div>
                      </div>
                      
                      {results.earningsAnalysis && (
                         <Card className="bg-card border shadow-primary-lg">
                            <CardHeader className="p-4">
                               <CardTitle className="font-bold text-sm flex items-center gap-2">
                                Análise de Monetização
                               </CardTitle>
                               <CardDescription>Como transformar seus seguidores em receita no nicho de {form.getValues('niche')}.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{results.earningsAnalysis}</p>
                            </CardContent>
                         </Card>
                      )}

                      {/* Action Plan */}
                       {(results.recommendations?.length || results.riskPanel?.length || results.trendSuggestions?.length) && (
                      <Card className="bg-card border shadow-primary-lg">
                          <CardHeader className="p-4"><h4 className="font-bold text-sm text-center">Seu Plano Inicial para Acelerar</h4></CardHeader>
                          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6 p-4 pt-0">
                              {results.recommendations && results.recommendations.length > 0 && (
                              <div>
                                <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Rocket className="h-4 w-4 text-primary" />Recomendações</h5>
                                <ul className="space-y-1.5 text-sm">
                                    {results.recommendations.map(rec => <li key={rec} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{rec}</span></li>)}
                                </ul>
                              </div>
                              )}
                              {results.riskPanel && results.riskPanel.length > 0 && (
                              <div>
                                <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" />Pontos de Atenção</h5>
                                <ul className="space-y-1.5 text-sm">
                                    {results.riskPanel.map(risk => <li key={risk} className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /><span>{risk}</span></li>)}
                                </ul>
                              </div>
                              )}
                              {results.trendSuggestions && results.trendSuggestions.length > 0 && (
                              <div className="lg:col-span-2">
                                <h5 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />Ideias de Ganchos Virais</h5>
                                <div className="grid sm:grid-cols-3 gap-3">
                                     {results.trendSuggestions.map(sug => <div key={sug.hook} className="p-3 rounded-lg bg-muted/50 border text-center"><p className="text-xl mb-1">{sug.icon}</p><p className="text-xs font-medium">{sug.hook}</p></div>)}
                                </div>
                              </div>
                              )}
                          </CardContent>
                      </Card>
                       )}

                      <div className="text-center mt-6 space-y-4">
                          <Button onClick={() => setStep(0)} variant="outline" size="lg" className="h-11 text-base">Calcular Novamente</Button>
                          <Button asChild size="lg" className="h-11 text-base ml-4"><Link href="/sign-up">Criar conta grátis para acelerar</Link></Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-2 max-w-4xl mx-auto">
                        Estimativas com base em benchmarks do nicho. Resultados variam por conteúdo, mercado e consistência.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="precos" className="py-20 sm:py-24 bg-background">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Planos para cada fase da sua jornada
              </h2>
              <p className="text-base text-muted-foreground">
                Comece de graça e faça o upgrade quando estiver pronto para monetizar e profissionalizar.
              </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
               {/* Plano Grátis */}
              <Card className="rounded-2xl p-6 flex flex-col h-full bg-muted/30 shadow-lg">
                <h3 className="text-xl font-bold font-headline mb-2">
                  Grátis
                </h3>
                <p className="text-muted-foreground mb-6 flex-grow text-sm">
                  Para quem está começando e quer testar a plataforma.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$0{' '}
                  <span className="text-base font-normal text-muted-foreground">
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
              <Card className="rounded-2xl p-6 border-2 border-primary relative flex flex-col h-full shadow-lg">
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2">
                  Mais Popular
                </Badge>
                <h3 className="text-xl font-bold font-headline mb-2">Pro</h3>
                <p className="text-muted-foreground mb-6 flex-grow text-sm">
                  Para criadores que levam o crescimento a sério e querem otimizar seu conteúdo.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$29{' '}
                  <span className="text-base font-normal text-muted-foreground">
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
                        <span>Gerações de IA <b>ilimitadas</b></span>
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
                        <span>Análise de Vídeo (3/dia)</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Suporte via e-mail</span>
                    </li>
                </ul>
                <Button className="w-full h-11 text-base font-bold mt-auto shadow-lg shadow-indigo-500/50" asChild>
                  <Link href="/subscribe?plan=pro">Assinar o Pro</Link>
                </Button>
              </Card>

              {/* Plano Premium */}
               <Card className="rounded-2xl p-6 border border-yellow-400/50 bg-yellow-400/5 flex flex-col h-full shadow-lg">
                 <h3 className="text-xl font-bold font-headline mb-2 flex items-center gap-2">
                  Premium
                  <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </h3>
                <p className="text-muted-foreground mb-6 flex-grow text-sm">
                  Acesso total para criadores que querem monetizar e profissionalizar sua carreira.
                </p>
                <p className="text-4xl font-bold mb-6">
                  R$39{' '}
                  <span className="text-base font-normal text-muted-foreground">
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
                        <span><b>Sincronização automática</b> de métricas</span>
                    </li>
                     <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Análise de Vídeo (10/dia)</span>
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
                </ul>
                <Button className="w-full h-11 text-base font-bold bg-yellow-500 hover:bg-yellow-500/90 text-black mt-auto shadow-lg shadow-yellow-500/50" asChild>
                  <Link href="/subscribe?plan=premium">Assinar o Premium</Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 sm:py-24 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-base text-muted-foreground">
                Respostas rápidas para as dúvidas mais comuns.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem value={item.question} key={item.question}>
                  <AccordionTrigger className="text-base font-semibold text-left">
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
        <section className="relative overflow-hidden bg-primary/95 text-primary-foreground py-20 sm:py-24">
            <div
                className="absolute inset-0 w-full h-full bg-grid-pattern opacity-10"
                aria-hidden="true"
            />
            <div className="container relative text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    viewport={{ once: true, amount: 0.5 }}
                    className="flex flex-col items-center"
                >
                    <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
                        Pronto para crescer?
                    </h2>
                    <p className="text-base text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                        Crie sua conta grátis e transforme seu conteúdo com o poder da
                        inteligência artificial.
                    </p>
                    <Button
                        size="lg"
                        variant="secondary"
                        className="w-full sm:w-auto h-12 text-base px-8 font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
             <p>
                &copy; {new Date().getFullYear()} trendify. Todos os direitos
                reservados.
              </p>
             <Link href="/support" className="hover:text-primary transition-colors">
                Suporte
              </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
