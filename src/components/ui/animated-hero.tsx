
'use client';
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
            <Button variant="secondary" size="sm" className="gap-4 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
               <Sparkles className="w-4 h-4" />
               Feito para criadores de conteúdo
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-6xl max-w-3xl tracking-tighter text-center font-bold font-headline">
              <span className="text-foreground/90">A plataforma IA para seu</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 text-primary">
                &nbsp;
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
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none">
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
                    'font-manrope rounded-lg text-base h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground shadow-lg hover:opacity-90 transition-opacity'
                )}
            >
              Começar Grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AnimatedHero };

    