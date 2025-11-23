"use client";

import { useState, useCallback, useRef, type ChangeEvent, type DragEvent, useEffect, useId } from "react";
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
  History,
  Inbox,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, increment, query, orderBy, limit } from "firebase/firestore";
import { useTransition } from "react";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { Plan, AnaliseVideo } from "@/lib/types";
import Link from "next/link";
import type { DailyUsage } from '@/lib/types';
import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


type AnalysisStatus = "idle" | "uploading" | "loading" | "success" | "error";
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
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useUser();
  const firestore = useFirestore();
  const { subscription } = useSubscription();
  const [isSaving, startSavingTransition] = useTransition();
  const uniqueId = useId();
  
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

  const previousAnalysesQuery = useMemoFirebase(() =>
    user && firestore ? query(collection(firestore, `users/${user.uid}/analisesVideo`), orderBy('createdAt', 'desc'), limit(5)) : null
  , [user, firestore]);
  const { data: previousAnalyses, isLoading: isLoadingAnalyses } = useCollection<AnaliseVideo>(previousAnalysesQuery);


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
    setUploadProgress(0);
  };

  const handleReset = () => {
    setFile(null);
    resetState();
  };

  const handleAnalyzeVideo = async () => {
    if (!file || !user) {
        setAnalysisError("Por favor, selecione um arquivo para analisar.");
        setAnalysisStatus("error");
        return;
    }
    if(hasReachedLimit || !usageDocRef) {
        toast({ title: "Limite atingido", description: "Você atingiu seu limite diário de análises.", variant: "destructive"});
        return;
    }

    setAnalysisStatus("uploading");
    setAnalysisError("");
    setAnalysisResult(null);

    // 1. Upload to Storage
    const storage = getStorage(initializeFirebase().firebaseApp);
    const videoId = Date.now().toString();
    const storageRef = ref(storage, `video-reviews/${user.uid}/${videoId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error("Upload error:", error);
            setAnalysisStatus("error");
            setAnalysisError(`Falha no upload do vídeo: ${error.message}`);
            toast({ title: 'Erro no Upload', description: error.message, variant: 'destructive' });
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setAnalysisStatus("loading");
                
                // 2. Read as Data URI for Genkit
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = async () => {
                    const base64data = reader.result as string;
                    
                    const result = await analyzeVideo({ videoDataUri: base64data });

                    if (result && result.data) {
                        setAnalysisResult(result.data);
                        setAnalysisStatus("success");
                        
                        // 3. Save analysis to Firestore
                        await addDoc(collection(firestore, `users/${user.uid}/analisesVideo`), {
                            userId: user.uid,
                            videoUrl: downloadURL,
                            videoFileName: file.name,
                            analysisData: result.data,
                            createdAt: serverTimestamp(),
                        });

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
                    throw new Error("Falha ao ler o arquivo de vídeo para análise.");
                }
            } catch (e: any) {
                console.error("Erro na análise:", e);
                const errorMsg = e.message || "Ocorreu um erro desconhecido durante a análise.";
                setAnalysisError(errorMsg);
                setAnalysisStatus("error");
                toast({ title: "Falha na Análise", description: errorMsg, variant: "destructive" });
            }
        }
    );
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
        />
        
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
                            <Button onClick={handleAnalyzeVideo} disabled={analysisStatus === 'loading' || analysisStatus === 'uploading' || hasReachedLimit} className="w-full sm:w-auto rounded-full font-manrope">
                            {analysisStatus === 'uploading' ? <><Loader2 className="mr-2 animate-spin" />Enviando...</> : analysisStatus === 'loading' ? <><Loader2 className="mr-2 animate-spin" />Analisando...</> : <><Sparkles className="mr-2" />Analisar Vídeo</>}
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="w-full sm-w-auto rounded-full font-manrope">
                                Trocar Vídeo
                            </Button>
                        </div>
                    </div>
                     {analysisStatus === 'uploading' && (
                        <div className="mt-4 space-y-2">
                            <Progress value={uploadProgress} />
                            <p className="text-xs text-muted-foreground text-center">Enviando vídeo para análise segura...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
        
        <div className="text-center">
            <p className="text-sm text-muted-foreground">
                Análises restantes hoje: <span className="font-bold text-primary">{analysesLeft} de {limit}</span>
            </p>
        </div>

        {(analysisStatus !== 'idle' && analysisStatus !== 'uploading') && (
            <div className="space-y-8 animate-fade-in">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
                    <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da Análise</h2>
                    <p className="text-muted-foreground">
                        Aqui está o diagnóstico completo do seu vídeo.
                    </p>
                    </div>
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
                                <CardTitle className="font-headline text-lg">Análise Detalhada</CardTitle>
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

        <Separator />

        <div className="space-y-6">
             <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Análises Anteriores</h2>
                <p className="text-muted-foreground">
                    Aqui estão os últimos vídeos que você analisou.
                </p>
            </div>
             <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                <CardContent className="pt-6">
                    {isLoadingAnalyses && (
                         <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    )}
                    {!isLoadingAnalyses && previousAnalyses && previousAnalyses.length > 0 && (
                        <ul className="space-y-4">
                            {previousAnalyses.map(analise => (
                                <li key={analise.id}>
                                    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                                        <Clapperboard className="h-6 w-6 text-primary shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground truncate">{analise.videoFileName}</p>
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(analise.createdAt.toDate(), { addSuffix: true, locale: ptBR })}</p>
                                        </div>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> Ver Análise</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl">
                                                <DialogHeader>
                                                    <DialogTitle className="font-headline text-2xl">Análise de {analise.videoFileName}</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
                                                    <div className="space-y-4">
                                                        <video controls src={analise.videoUrl} className="w-full rounded-lg bg-black"></video>
                                                        
                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-lg text-primary">Nota de Viralização</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-3xl font-bold">{analise.analysisData.geral.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*10/)?.[0] || '-/10'}</div>
                                                                <p className="text-sm text-muted-foreground mt-1">{analise.analysisData.geral.replace(/(\d{1-2}(?:[.,]\d{1,2})?)\s*\/\s*10[:\s]*/, '')}</p>
                                                            </CardContent>
                                                        </Card>

                                                         <Card>
                                                            <CardHeader>
                                                                <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="h-5 w-5 text-primary" /> Checklist de Melhorias</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <ul className="space-y-2 text-sm">
                                                                    {analise.analysisData.melhorias.map((item: string, index: number) => (
                                                                        <li key={index} className="flex items-start gap-2">
                                                                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                                                                            <span className="text-muted-foreground">{item}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                    <Card>
                                                         <CardHeader>
                                                            <CardTitle className="text-lg">Análise Detalhada</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <Accordion type="single" collapsible defaultValue="item-1">
                                                                <AccordionItem value="item-1">
                                                                    <AccordionTrigger>Gancho</AccordionTrigger>
                                                                    <AccordionContent>{analise.analysisData.gancho}</AccordionContent>
                                                                </AccordionItem>
                                                                <AccordionItem value="item-2">
                                                                    <AccordionTrigger>Conteúdo</AccordionTrigger>
                                                                    <AccordionContent>{analise.analysisData.conteudo}</AccordionContent>
                                                                </AccordionItem>
                                                                <AccordionItem value="item-3">
                                                                    <AccordionTrigger>CTA</AccordionTrigger>
                                                                    <AccordionContent>{analise.analysisData.cta}</AccordionContent>
                                                                </AccordionItem>
                                                            </Accordion>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                     {!isLoadingAnalyses && (!previousAnalyses || previousAnalyses.length === 0) && (
                        <div className="text-center py-16 px-4 rounded-xl bg-muted/50 border border-dashed">
                            <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-foreground">
                                Nenhuma análise anterior
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Seus vídeos analisados aparecerão aqui.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
