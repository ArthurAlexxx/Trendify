
'use client';
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Sparkles, Users, Lightbulb, BarChart as BarChartIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

function AnimatedHero() {
  const [currentTitle, setCurrentTitle] = useState('');
  const [titleIndex, setTitleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const titles = useMemo(
    () => ["crescimento", "roteiros", "ideias", "parcerias", "conteúdo"],
    []
  );

  useEffect(() => {
    const typeSpeed = isDeleting ? 75 : 150;
    const fullWord = titles[titleIndex];

    const handleTyping = () => {
      if (isDeleting) {
        if (currentTitle.length > 0) {
          setCurrentTitle(currentTitle.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTitleIndex((prevIndex) => (prevIndex + 1) % titles.length);
        }
      } else {
        if (currentTitle.length < fullWord.length) {
          setCurrentTitle(fullWord.slice(0, currentTitle.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 1500);
        }
      }
    };

    const timeoutId = setTimeout(handleTyping, typeSpeed);
    return () => clearTimeout(timeoutId);
  }, [currentTitle, isDeleting, titleIndex, titles]);


  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.85, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], ['40px', '0px']);


  return (
    <div className="w-full">
      <div className="relative pt-32 pb-24 px-6 text-center">
        {/* Text Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
              <div>
                  <Button variant="outline" size="sm" className="gap-4 rounded-full bg-transparent text-primary hover:bg-primary/10 border-primary">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Feito para criadores de conteúdo
                  </Button>
              </div>
              <div className="flex gap-4 flex-col mt-6">
                 <h1 className="text-5xl md:text-6xl max-w-3xl tracking-tighter font-bold font-headline flex flex-wrap justify-center items-center">
                    <span className="text-foreground/90 mr-3">A plataforma para seu</span>
                    <span className="relative inline-block text-center h-16 text-primary min-w-[300px]">
                      <span className="font-semibold bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 text-gradient">
                        {currentTitle}
                      </span>
                      <span className="animate-ping">|</span>
                    </span>
                  </h1>


                  <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl mx-auto">
                  A Trendify usa IA para transformar seus dados em um plano de
                  ação claro, ajudando você a crescer e monetizar seu conteúdo.
                  </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none justify-center mt-8">
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
          <div ref={targetRef} className="relative mt-20">
            <div className="absolute inset-0 -z-10 bg-gradient-radial from-primary/10 via-primary/5 to-transparent" />
            <motion.div style={{ scale, y }}>
                <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-4233590611-a8ab0.firebasestorage.app/o/Sem%20nome%20(Quadro%20branco)%20(2).png?alt=media&token=7f2fd083-8a2a-469b-a6df-8173e38b8a10"
                alt="Dashboard da Trendify mostrando métricas de crescimento"
                width={1200}
                height={750}
                className="w-full max-w-5xl mx-auto h-auto"
                priority
                />
            </motion.div>
          </div>
        </div>
    </div>
  );
}

export { AnimatedHero };
