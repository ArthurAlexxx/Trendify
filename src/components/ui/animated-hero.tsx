
'use client';
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Sparkles, Users, Lightbulb, BarChart as BarChartIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

function AnimatedHero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["crescimento", "roteiros", "ideias", "parcerias", "conteúdo"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);


  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 pt-32 items-center justify-center flex-col">
          <div>
            <Button variant="outline" size="sm" className="gap-4 rounded-full bg-transparent text-primary hover:bg-primary/10 border-primary">
               <Sparkles className="w-4 h-4 animate-pulse" />
               Feito para criadores de conteúdo
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-6xl max-w-3xl tracking-tighter text-center font-bold font-headline">
              <span className="text-foreground/90">A plataforma para seu</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 text-primary">
                 
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 text-gradient"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              A Trendify usa IA para transformar seus dados em um plano de
              ação claro, ajudando você a crescer e monetizar seu conteúdo.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:justify-center">
             <Link
                href="/dashboard"
                className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'font-manrope rounded-lg text-base h-12 px-8 w-full sm:w-auto bg-background/50'
                )}
            >
                Já tenho conta
            </Link>
             <Link
                href="/sign-up"
                className={cn(
                    buttonVariants({ size: 'lg' }),
                    'font-manrope rounded-lg text-base h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground shadow-2xl shadow-indigo-500/50 hover:opacity-90 transition-opacity'
                )}
            >
              Começar Grátis <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      
      <section
        ref={targetRef}
        className="relative py-12"
      >
         <div
            className="absolute inset-0"
            style={{
                background: 'ellipse 70% 40% at 50% 50%',
                backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 50%, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
            }}
            aria-hidden="true"
        />
        <div className="container mx-auto">
          <motion.div
            style={{ scale }}
            className="relative w-full max-w-screen-xl mx-auto hidden lg:block"
          >
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-4233590611-a8ab0.firebasestorage.app/o/Sem%20nome%20(Quadro%20branco).png?alt=media&token=242aeba3-137e-4a70-b344-c81507275c68"
              alt="Dashboard da Trendify mostrando métricas de crescimento"
              width={1200}
              height={750}
              className="w-full h-auto"
              priority
            />
          </motion.div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 border rounded-lg px-3 py-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold">+20 mil</span>
                <span className="text-muted-foreground">criadores ativos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 border rounded-lg px-3 py-1.5">
                <Lightbulb className="h-4 w-4 text-primary" />
                 <span className="font-semibold">+500 mil</span>
                <span className="text-muted-foreground">ideias geradas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 border rounded-lg px-3 py-1.5">
                <BarChartIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold">+85%</span>
                <span className="text-muted-foreground">de crescimento médio</span>
              </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export { AnimatedHero };
