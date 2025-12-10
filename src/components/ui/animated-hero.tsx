
'use client';
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
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

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
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
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 text-gradient text-shadow-glow"
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

           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-full max-w-7xl mt-12"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl opacity-20 blur-2xl"></div>
             <div className="relative rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/studio-4233590611-a8ab0.firebasestorage.app/o/FundoHeroBolo.png?alt=media&token=84189787-4b79-4217-b72a-c613f9d42cd1"
                    alt="Dashboard da Trendify mostrando métricas de crescimento"
                    width={1200}
                    height={750}
                    className="w-full h-auto"
                    priority
                />
             </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

export { AnimatedHero };
