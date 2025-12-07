
'use client';
import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Info, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Required shadcn/ui components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form";
import { Textarea } from "./textarea";

const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

// --- Component Props Interface ---
interface ObjectiveFormCardProps {
  initialData?: {
    topic: string;
    targetAudience: string;
    objective: string;
  };
  onSubmit: (data: FormSchemaType) => void;
  onCancel: () => void;
  className?: string;
}

// --- Main Component ---
export const ObjectiveFormCard: React.FC<ObjectiveFormCardProps> = ({
  initialData,
  onSubmit,
  onCancel,
  className,
}) => {
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      topic: '',
      targetAudience: '',
      objective: 'Engajamento',
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = (data: FormSchemaType) => {
    setIsSubmitting(true);
    onSubmit(data);
    // The parent component will handle closing and submission state
  };

  // --- Animation Variants for Framer Motion ---
  const FADE_IN_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      }}
      className={cn(
        "relative w-full rounded-2xl border-0 bg-card text-card-foreground shadow-xl shadow-primary/20 p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <motion.div variants={FADE_IN_VARIANTS}>
            <h3 className="text-xl font-bold font-headline text-foreground flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Briefing de Conteúdo
            </h3>
            <p className="text-muted-foreground mt-1">Forneça os detalhes para a IA criar uma ideia de vídeo otimizada.</p>
        </motion.div>
        
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 grid grid-cols-1 gap-6">
          <motion.div variants={FADE_IN_VARIANTS}>
             <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tópico Principal</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Ex: Rotina de skincare para pele oleosa"
                        className="min-h-[100px] bg-muted/50"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
          </motion.div>

          <motion.div variants={FADE_IN_VARIANTS}>
             <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Público-Alvo</FormLabel>
                    <FormControl>
                        <Input
                        placeholder="Ex: Mulheres de 25-35 anos"
                        className="h-12 bg-muted/50"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
          </motion.div>

           <motion.div variants={FADE_IN_VARIANTS}>
            <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Objetivo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="h-12 bg-muted/50">
                        <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Engajamento">Engajamento</SelectItem>
                        <SelectItem value="Alcance">Alcance</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="Educar">Educar</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
          </motion.div>
          
          <motion.div variants={FADE_IN_VARIANTS} className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gerar Ideia
            </Button>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
};
