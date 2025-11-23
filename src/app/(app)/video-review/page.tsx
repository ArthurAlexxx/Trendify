"use client";

import { useState, useCallback, useRef, type ChangeEvent, type DragEvent, useEffect } from "react";
import {
  UploadCloud,
  Loader2,
  Sparkles,
  Clapperboard,
  Check,
  Save,
  Video,
  XCircle,
  Lightbulb,
  BrainCircuit,
  Target,
  BarChart,
  Eye,
  Crown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { analyzeVideo, type VideoAnalysisOutput } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { SavedIdeasSheet } from "@/components/saved-ideas-sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";
import { useTransition } from "react";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { Plan } from "@/lib/types";
import Link from "next/link";
import type { DailyUsage } from '@/lib/types';
import { format as formatDate } from 'date-fns';
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


type AnalysisStatus = "idle" | "loading" | "success" | "error";
const MAX_FILE_SIZE_MB = 70;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PLAN_LIMITS: Record<Plan, number> = {
  free: 0,
  pro: 3,
  premium: 10,
};


function PremiumFeatureGuard({ children }: { children: React.ReactNode }) {
    const { subscription, isLoading } = useSubscription();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isPaidPlan = (subscription?.plan === 'pro' || subscription?.plan === 'premium') && subscription.status === 'active';
    
    if (!isPaidPlan) {
        return (
             <AlertDialog open={true} onOpenChange={(open) => !open && router.push('/subscribe')}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Funcionalidade Pro</AlertDialogTitle>
                  <AlertDialogDescription>
                    A Análise de Vídeo é um recurso exclusivo para assinantes dos planos Pro ou Premium. Faça o upgrade para ter acesso!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push('/subscribe')}>Ver Planos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    return <>{children}</>;
}

export default function VideoReviewPage() {
    return (
        <PremiumFeatureGuard>
            <VideoReviewPageContent />
        </PremiumFeatureGuard>
    )
}

function VideoReviewPageContent() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");
  
  const { user } = useUser();
  const firestore = useFirestore();
  const { subscription } = useSubscription();
  const [isSaving, startSavingTransition] = useTransition();
  
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
  const usageDocRef = useMemoFirebase(() =>
    user && firestore ? doc(firestore, `users/${user.uid}/dailyUsage`, todayStr) : null
  , [user, firestore, todayStr]);
  
  const { data: dailyUsage, isLoading: isLoadingUsage } = useDoc<DailyUsage>(usageDocRef);
  
  const analysesDoneToday = dailyUsage?.videoAnalyses || 0;
  const currentPlan = subscription?.plan || 'free';
  const limit = PLAN_LIMITS[currentPlan];
  const analysesLeft = Math.max(0, limit - analysesDoneToday);
  const hasReachedLimit = analysesLeft <= 0;


  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        toast({
          title: "Arquivo Inválido",
          description: "Por favor, selecione um arquivo de vídeo (MP4, MOV, etc.).",
          variant: "destructive",
        });
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Arquivo Muito Grande",
          description: `O vídeo deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      resetState();
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetState = () => {
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setAnalysisError("");
  };

  const handleReset = () => {
    setFile(null);
    resetState();
  };

  const handleAnalyzeVideo = async () => {
    if (!file) {
        setAnalysisError("Por favor, selecione um arquivo para analisar.");
        setAnalysisStatus("error");
        return;
    }
    if(hasReachedLimit || !usageDocRef) {
        toast({ title: "Limite atingido", description: "Você atingiu seu limite diário de análises.", variant: "destructive"});
        return;
    }

    setAnalysisStatus("loading");
    setAnalysisError("");
    setAnalysisResult(null);

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            
            const result = await analyzeVideo({ videoDataUri: base64data });

            if (result && result.data) {
                setAnalysisResult(result.data);
                setAnalysisStatus("success");
                
                // Increment usage in Firestore
                await setDoc(usageDocRef, { videoAnalyses: increment(1), date: todayStr }, { merge: true });

                 toast({
                    title: "Análise Concluída",
                    description: "A análise do seu vídeo está pronta.",
                });
            } else {
                throw new Error(result?.error || "A análise não produziu um resultado.");
            }
        };
        reader.onerror = () => {
            throw new Error("Falha ao ler o arquivo de vídeo.");
        }
    } catch (e: any) {
        console.error("Erro na análise:", e);
        const errorMsg = e.message || "Ocorreu um erro desconhecido durante a análise.";
        setAnalysisError(errorMsg);
        setAnalysisStatus("error");
        toast({
            title: "Falha na Análise",
            description: errorMsg,
            variant: "destructive",
        });
    }
  };

  const handleSaveAnalysis = () => {
    if (!analysisResult || !file || !user || !firestore) return;

    startSavingTransition(async () => {
      try {
        const title = `Análise do vídeo: ${file.name}`;
        
        let content = `**Nota Geral:** ${analysisResult.geral}\n\n`;
        content += `**Gancho:**\n${analysisResult.gancho}\n\n`;
        content += `**Conteúdo:**\n${analysisResult.conteudo}\n\n`;
        content += `**CTA:**\n${analysisResult.cta}\n\n`;
        content += `**Checklist de Melhorias:**\n- ${analysisResult.melhorias.join('\n- ')}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Análise de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Análise Salva!',
          description: 'Você pode encontrá-la no painel de ideias salvas.',
        });
      } catch (error) {
        console.error('Failed to save analysis:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a análise. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const noteMatch = analysisResult?.geral.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*10/);
  const numericNote = noteMatch ? noteMatch[1] : analysisResult?.geral;
  const noteDescription = noteMatch ? analysisResult?.geral.replace(noteMatch[0], '').replace(':', '').trim() : '';

  const analysisCriteria = [
    {
        icon: Eye,
        title: "Retenção e Gancho",
        description: "Avaliamos os 3 primeiros segundos para ver se o gancho é forte o suficiente para parar a rolagem e gerar curiosidade."
    },
    {
        icon: BrainCircuit,
        title: "Ritmo e Conteúdo",
        description: "Analisamos a estrutura do vídeo, o ritmo da edição e a clareza da mensagem para identificar pontos que podem causar a perda de interesse."
    },
    {
        icon: Target,
        title: "Eficácia do CTA",
        description: "Verificamos se a chamada para ação (CTA) é clara, convincente e está alinhada com o objetivo do vídeo (vendas, seguidores, etc.)."
    },
     {
        icon: BarChart,
        title: "Potencial de Viralização",
        description: "Com base em todos os fatores, atribuímos uma nota e um checklist de melhorias para aumentar o potencial de alcance do seu vídeo."
    }
  ]
  
  return (
    <div className="space-y-12">
        <PageHeader
            icon={<Video className="text-primary" />}
            title="Diagnóstico de Vídeo"
            description="Receba uma análise completa do potencial de viralização do seu vídeo e um plano de ação para melhorá-lo."
        >
            <SavedIdeasSheet />
        </PageHeader>
        
        <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-xl text-center sm:text-left">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Como Avaliamos Seu Vídeo?
                </CardTitle>
                 <CardDescription className="text-center sm:text-left">Nossa plataforma foi treinada para pensar como um estrategista de conteúdo viral. Analisamos seu vídeo em busca de 4 pilares fundamentais:</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {analysisCriteria.map((item, index) => (
                        <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                            <div className="flex items-center gap-3 mb-2">
                                <item.icon className="h-5 w-5 text-primary" />
                                <h4 className="font-semibold text-foreground">{item.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
        
        <Separator />

        {!file ? (
             <div
                className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/10" : "border-border/50"
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-xl font-bold tracking-tight text-foreground">
                    Arraste seu vídeo para cá
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    ou clique para selecionar um arquivo. Limite de {MAX_FILE_SIZE_MB}MB por vídeo.
                </p>
                <Button
                type="button"
                variant="outline"
                className="mt-6 rounded-full font-manrope"
                onClick={() => fileInputRef.current?.click()}
                disabled={hasReachedLimit}
                >
                Selecionar Vídeo
                </Button>
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept="video/*"
                />
            </div>
        ) : (
            <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-center sm:text-left">
                        Vídeo Selecionado
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border rounded-lg flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left bg-muted/30">
                        <Clapperboard className="h-10 w-10 text-primary" />
                        <div className="flex-1">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'unit', unit: 'megabyte', unitDisplay: 'short' }).format(file.size / 1024 / 1024)}</p>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                            <Button onClick={handleAnalyzeVideo} disabled={analysisStatus === 'loading' || hasReachedLimit} className="w-full sm:w-auto rounded-full font-manrope">
                            {analysisStatus === 'loading' ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            Analisar Vídeo
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto rounded-full font-manrope">
                                Trocar Vídeo
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
        
        <div className="text-center">
            <p className="text-sm text-muted-foreground">
                Análises restantes hoje: <span className="font-bold text-primary">{analysesLeft} de {limit}</span>
            </p>
        </div>

        {(analysisStatus !== 'idle') && (
            <div className="space-y-8 animate-fade-in">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
                    <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da Análise</h2>
                    <p className="text-muted-foreground">
                        Aqui está o diagnóstico completo do seu vídeo.
                    </p>
                    </div>
                    {analysisResult && (
                    <Button onClick={handleSaveAnalysis} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Análise
                    </Button>
                    )}
                </div>

                {analysisStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Estamos processando seu vídeo...</p>
                        <p className="text-sm text-muted-foreground">Isso pode levar alguns instantes.</p>
                    </div>
                )}
                
                {analysisStatus === 'error' && (
                     <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Erro na Análise</AlertTitle>
                      <AlertDescription>
                        {analysisError}
                      </AlertDescription>
                    </Alert>
                )}

                {analysisStatus === 'success' && analysisResult && (
                    <div className="grid gap-8">
                       <div className="grid lg:grid-cols-3 gap-8 items-start">
                         <Card className="lg:col-span-1 shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                             <CardHeader>
                                <CardTitle className="font-headline text-lg text-primary text-center">Nota de Viralização</CardTitle>
                             </CardHeader>
                             <CardContent className="text-center">
                                <div className="text-4xl font-bold text-foreground">{numericNote}/10</div>
                                <p className="text-sm text-muted-foreground mt-2">{noteDescription}</p>
                             </CardContent>
                         </Card>

                         <Card className="lg:col-span-2 shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                                    <Lightbulb className="h-5 w-5 text-primary" />
                                    <span>Checklist de Melhorias</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {analysisResult.melhorias.map((item, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                        <span className="text-muted-foreground">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                         </Card>
                       </div>
                       
                        <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                            <CardHeader>
                                <CardTitle>Análise Detalhada</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <Accordion type="single" collapsible className="w-full text-left">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Análise do Gancho</AccordionTrigger>
                                        <AccordionContent className="whitespace-pre-wrap">{analysisResult.gancho}</AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Análise do Conteúdo</AccordionTrigger>
                                        <AccordionContent className="whitespace-pre-wrap">{analysisResult.conteudo}</AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>Análise do CTA</AccordionTrigger>
                                        <AccordionContent className="whitespace-pre-wrap">{analysisResult.cta}</AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
