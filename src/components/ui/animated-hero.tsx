
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
        <div className="relative pt-16 md:pt-32">
            {/* Text Content */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:w-1/2">
                <div>
                    <Button variant="outline" size="sm" className="gap-4 rounded-full bg-transparent text-primary hover:bg-primary/10 border-primary">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Feito para criadores de conteúdo
                    </Button>
                </div>
                <div className="flex gap-4 flex-col mt-6">
                    <h1 className="text-5xl md:text-6xl max-w-3xl tracking-tighter font-bold font-headline">
                    <span className="text-foreground/90">A plataforma para seu</span>
                    <span className="relative flex w-full justify-center lg:justify-start overflow-hidden text-center md:pb-4 md:pt-1 text-primary">
                         
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

                    <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl">
                    A Trendify usa IA para transformar seus dados em um plano de
                    ação claro, ajudando você a crescer e monetizar seu conteúdo.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:justify-center lg:justify-start mt-8">
                    <Link
                        href="/sign-up"
                        className={cn(
                            buttonVariants({ size: 'lg' }),
                            'font-manrope rounded-lg text-base h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground shadow-2xl shadow-indigo-500/50 hover:opacity-90 transition-opacity'
                        )}
                    >
                    Começar Grátis <ArrowUpRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/login"
                        className={cn(
                            buttonVariants({ size: 'lg', variant: 'outline' }),
                            'font-manrope rounded-lg text-base h-12 px-8 w-full sm:w-auto bg-background/50'
                        )}
                    >
                        Já tenho conta
                    </Link>
                </div>
            </div>

            {/* Image Content */}
            <div
                ref={targetRef}
                className="absolute top-0 right-0 h-full w-full -z-10 hidden lg:block"
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'ellipse 70% 40% at 50% 50%',
                        backgroundImage: 'radial-gradient(ellipse 80% 50% at 70% 50%, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
                    }}
                    aria-hidden="true"
                />
                <motion.div
                    style={{ scale }}
                    className="absolute top-1/2 -translate-y-1/2 right-0 w-4/5 translate-x-1/4"
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
            </div>
        </div>
      </div>
    </div>
  );
}

export { AnimatedHero };
