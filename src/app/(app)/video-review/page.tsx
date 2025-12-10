

"use client";

import { useState, useRef, type ChangeEvent, useEffect } from "react";
import {
  UploadCloud,
  Loader2,
  Sparkles,
  Clapperboard,
  Check,
  Video,
  XCircle,
  Lightbulb,
  BrainCircuit,
  Target,
  BarChart as BarChartIcon,
  Eye,
  Crown,
  History,
  Inbox,
  AlertTriangle,
  Flame,
  Info,
  ChevronLeft,
  ChevronRight
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
import { useResponsiveToast } from "@/hooks/use-responsive-toast";
import { analyzeVideo } from "@/ai/flows/analyze-video-flow";
import type { AnalyzeVideoOutput } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, increment, query, orderBy, limit, getDoc, onSnapshot, serverTimestamp, addDoc, updateDoc } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from '@/hooks/useSubscription';
import { Plan } from "@/lib/types";
import Link from "next/link";
import type { DailyUsage, AnaliseVideo } from '@/lib/types';
import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { initializeFirebase } from "@/firebase";

type AnalysisStatus = "idle" | "uploading" | "analyzing" | "success" | "error";
const MAX_FILE_SIZE_MB = 70;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PLAN_LIMITS: Record<Exclude<Plan, 'free'>, number> = {
  pro: 3,
  premium: 10,
};

function FeatureGuard({ children }: { children: React.ReactNode }) {
    const { subscription, isLoading, isTrialActive } = useSubscription();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const isPaidPlan = (subscription?.plan === 'pro' || subscription?.plan === 'premium');

    if (!isPaidPlan && !isTrialActive) {
        return (
             <AlertDialog open={true} onOpenChange={(open) => !open && router.push('/subscribe')}>
              <AlertDialogContent>
                <AlertDialogHeader className="text-center items-center">
                   <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 border-2 border-primary/20">
                     <Crown className="h-8 w-8 text-primary" />
                   </div>
                  <AlertDialogTitle className="font-headline text-xl">Funcionalidade Indisponível</AlertDialogTitle>
                  <AlertDialogDescription>
                    A Análise de Vídeo é um recurso para assinantes Pro ou Premium.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push('/subscribe')} className="w-full">Ver Planos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    return <>{children}</>;
}


export default function VideoReviewPage() {
    return (
        <FeatureGuard>
            <VideoReviewPageContent />
        </FeatureGuard>
    )
}

function VideoReviewPageContent() {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useResponsiveToast();

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeVideoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");
  const [activeTab, setActiveTab] = useState("generate");
  const [analysisName, setAnalysisName] = useState("");

  const { user } = useUser();
  const firestore = useFirestore();
  const { subscription, isTrialActive } = useSubscription();
  
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
  
  const [usageData, setUsageData] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;


  useEffect(() => {
    if (!user || !firestore) return;
    const usageDocRef = doc(firestore, `users/${user.uid}/dailyUsage/${todayStr}`);
    
    const unsubscribe = onSnapshot(usageDocRef, (doc) => {
        setUsageData(doc.exists() ? doc.data() as DailyUsage : null);
        setIsLoadingUsage(false);
    });

    return () => unsubscribe();
  }, [user, firestore, todayStr]);

  
  const analysesDoneToday = usageData?.videoAnalyses || 0;
  const currentPlan = subscription?.plan || 'free';
  const limitCount = currentPlan === 'free' ? 1 : PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 0;
  const analysesLeft = Math.max(0, limitCount - analysesDoneToday);
  const hasReachedLimit = isTrialActive ? (analysesDoneToday >= PLAN_LIMITS['pro']) : (currentPlan === 'free' || analysesLeft <= 0);

  const previousAnalysesQuery = useMemoFirebase(() =>
    user && firestore ? query(collection(firestore, `users/${user.uid}/analisesVideo`), orderBy('createdAt', 'desc')) : null
  , [user, firestore]);

  const { data: previousAnalyses, isLoading: isLoadingAnalyses } = useCollection<AnaliseVideo>(previousAnalysesQuery);

    // Pagination Logic
  const totalPages = previousAnalyses ? Math.ceil(previousAnalyses.length / ITEMS_PER_PAGE) : 0;
  const paginatedAnalyses = previousAnalyses?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
          description: `O vídeo para análise deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setAnalysisName(selectedFile.name); // Default name
      resetAnalysisState();
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetAnalysisState = () => {
    setAnalysisStatus("idle");
    setUploadProgress(0);
    setAnalysisResult(null);
    setAnalysisError("");
    setActiveTab("generate");
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisName("");
    resetAnalysisState();
  };
  
  const fileToDataUri = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
  }

  const handleAnalyzeVideo = async () => {
    if (!file || !user || !firestore) {
      toast({ title: "Faltam informações para iniciar a análise.", variant: "destructive" });
      return;
    }
    if (hasReachedLimit) {
      toast({ title: "Limite diário de análises atingido.", variant: "destructive" });
      return;
    }
    
    setActiveTab("result");
    setAnalysisStatus("analyzing");
    setAnalysisError("");
    setAnalysisResult(null);
    setUploadProgress(0);

    try {
        const videoDataUri = await fileToDataUri(file);
        
        const result = await analyzeVideo({
            videoDataUri: videoDataUri,
            prompt: "Faça uma análise completa deste vídeo para um criador de conteúdo.",
        });

        setAnalysisResult(result);
        setAnalysisStatus("success");

        // Start upload to Firebase Storage in the background for history
        const { firebaseApp } = initializeFirebase();
        const storage = getStorage(firebaseApp);
        const storagePath = `video-reviews/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            null, // No need to track progress for background upload
            (error) => {
                console.error("Background upload error:", error);
                // Optionally notify user that history save failed
            },
            async () => { // Upload success
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                 try {
                    await addDoc(collection(firestore, `users/${user.uid}/analisesVideo`), {
                        userId: user.uid,
                        videoUrl: downloadURL,
                        videoFileName: file.name,
                        analysisName: analysisName || file.name,
                        analysisData: result,
                        createdAt: serverTimestamp(),
                    });

                    const usageDocRef = doc(firestore, `users/${user.uid}/dailyUsage/${todayStr}`);
                    const usageDoc = await getDoc(usageDocRef);
                    if (usageDoc.exists()) {
                        await updateDoc(usageDocRef, { videoAnalyses: increment(1) });
                    } else {
                        await setDoc(usageDocRef, { date: todayStr, videoAnalyses: 1, geracoesAI: 0 });
                    }
                    toast({ title: "Análise Concluída!", description: "Seu vídeo foi analisado e salvo no seu histórico." });
                } catch (saveError: any) {
                    console.error('Failed to save analysis:', saveError);
                    toast({
                        title: 'Análise Concluída (com um porém)',
                        description: 'Não foi possível salvar sua análise no histórico. Erro: ' + saveError.message,
                        variant: 'destructive',
                        duration: 7000,
                    });
                }
            }
        );

    } catch (e: any) {
        setAnalysisError(e.message || "Ocorreu um erro desconhecido na análise.");
        setAnalysisStatus("error");
    }
  };

  const getNoteParts = (geralText: string | undefined): { note: string, description: string } => {
    if (!geralText) return { note: '-', description: 'Análise indisponível.' };
    const scoreRegex = /(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*10|Nota:\s*(\d{1,2}(?:[.,]\d{1.2})?)|^(\d{1,2}(?:[.,]\d{1,2})?)\s*[-–—:]?/i;
    const scoreMatch = geralText.match(scoreRegex);

    if (scoreMatch) {
      const note = scoreMatch[1] || scoreMatch[2] || scoreMatch[3];
      const description = geralText.replace(scoreMatch[0], '').replace(/^[:\s-]+/, '').trim();
      return { note: note.replace(',', '.'), description: description };
    }
    return { note: '-', description: geralText };
  };

  const { note: numericNote, description: noteDescription } = getNoteParts(analysisResult?.geral);

  const analysisCriteria = [
    { icon: Eye, title: "Retenção e Gancho", description: "Avaliamos os 3 primeiros segundos para ver se o gancho é forte o suficiente para parar a rolagem." },
    { icon: BrainCircuit, title: "Ritmo e Conteúdo", description: "Analisamos a estrutura do vídeo e a clareza da mensagem para identificar pontos de perda de interesse." },
    { icon: Target, title: "Eficácia do CTA", description: "Verificamos se a chamada para ação é clara e está alinhada com o objetivo do vídeo." },
    { icon: BarChartIcon, title: "Potencial de Viralização", description: "Com base em todos os fatores, atribuímos uma nota e um checklist de melhorias para seu vídeo." }
  ];
  
  return (
    <div className="space-y-8">
        <PageHeader title="Diagnóstico de Vídeo" description="Receba uma análise do potencial de viralização e um plano de ação para seu vídeo." />
        
        <div>
          <div className="text-center"><h2 className="text-xl font-bold font-headline">Como Avaliamos Seu Vídeo?</h2><p className="text-muted-foreground">Nossa IA atua como uma estrategista de conteúdo viral e analisa 4 pilares:</p></div>
          <div className="py-8">
            <div className="md:hidden">
                <Carousel className="w-full" opts={{ align: 'start' }}><CarouselContent className="-ml-4">{analysisCriteria.map((item, index) => (<CarouselItem key={index} className="pl-4 basis-[90%] pb-12"><Card className="relative z-10 h-full rounded-2xl border-0 text-center shadow-primary-lg"><CardHeader className="items-center"><CardTitle className="flex flex-col items-center gap-2"><item.icon className="h-5 w-5 text-primary" /><span className="text-base font-semibold">{item.title}</span></CardTitle></CardHeader><CardContent className="pb-6"><p className="text-muted-foreground text-sm">{item.description}</p></CardContent></Card></CarouselItem>))}</CarouselContent></Carousel>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">{analysisCriteria.map((item, index) => (<Card key={index} className='rounded-2xl border-0 text-center shadow-primary-lg'><CardHeader className="items-center"><CardTitle className="flex flex-col items-center gap-2"><item.icon className="h-5 w-5 text-primary" /><span className="text-base font-semibold">{item.title}</span></CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">{item.description}</p></CardContent></Card>))}</div>
        </div>
        </div>
        
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="generate">Analisar Vídeo</TabsTrigger><TabsTrigger value="result" disabled={!file}>Resultado { (analysisStatus === 'analyzing' || analysisStatus === 'uploading') && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}</TabsTrigger></TabsList>
        <TabsContent value="generate">
            <Card className="rounded-t-none border-t-0 shadow-primary-lg">
                 <CardHeader><CardTitle className="text-center">Upload do Vídeo</CardTitle><CardDescription className="text-center">Arraste seu vídeo ou clique para selecionar.</CardDescription></CardHeader>
                <CardContent className="p-6 space-y-6">
                 {!file ? (
                    <div className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors border-border/50"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary"><UploadCloud className="h-8 w-8" /></div><h3 className="mt-6 text-xl font-bold tracking-tight text-foreground">Arraste seu vídeo para cá</h3><p className="mt-2 text-sm text-muted-foreground">ou clique para selecionar. Limite de ${MAX_FILE_SIZE_MB}MB.</p><Button type="button" variant="outline" className="mt-6" onClick={() => fileInputRef.current?.click()} disabled={hasReachedLimit}>Selecionar Vídeo</Button><Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} accept="video/*"/></div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg flex flex-col sm:flex-row items-center gap-4 bg-muted/30">
                            <Clapperboard className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-center sm:text-left"><p className="font-medium">{file.name}</p><p className="text-sm text-muted-foreground">{new Intl.NumberFormat('pt-BR', { style: 'unit', unit: 'megabyte', unitDisplay: 'short' }).format(file.size / 1024 / 1024)}</p></div>
                            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2"><Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">Trocar Vídeo</Button></div>
                        </div>
                         <Input placeholder="Dê um nome para esta análise..." value={analysisName} onChange={(e) => setAnalysisName(e.target.value)} className="h-12 bg-muted/50 text-base" />
                          <Button onClick={handleAnalyzeVideo} disabled={analysisStatus !== 'idle' || hasReachedLimit} className="w-full h-12 text-base"><Sparkles className="mr-2" />Analisar Vídeo</Button>
                    </div>
                )}
                 <div className="text-center mt-6"><p className="text-sm text-muted-foreground">{isLoadingUsage ? <div className="h-4 bg-muted rounded w-48 inline-block animate-pulse" /> : <>Análises restantes hoje: <span className="font-bold text-primary">{analysesLeft} de {limitCount}</span></>}
</p>{hasReachedLimit && currentPlan !== 'premium' && (<p className="text-xs text-muted-foreground">Você atingiu seu limite diário. Para mais análises, <Link href="/subscribe" className="underline text-primary">faça upgrade</Link>.</p>)}</div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="result">
          <Card className="rounded-t-none border-t-0 shadow-primary-lg">
            <CardContent className="p-6">
              {(analysisStatus !== 'idle') && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-center sm:text-left"><div className="flex-1"><h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da Análise</h2><p className="text-muted-foreground">Aqui está o diagnóstico completo do seu vídeo.</p></div></div>
                    { (analysisStatus === 'uploading' || analysisStatus === 'analyzing') && (<div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">{analysisStatus === 'uploading' ? 'Enviando seu vídeo...' : 'Analisando...'}</p><p className="text-sm text-muted-foreground">{analysisStatus === 'analyzing' && "Isso pode levar até 1 minuto."}</p>{analysisStatus === 'uploading' && <Progress value={uploadProgress} className="w-full max-w-sm mt-4" />}</div>)}
                    {analysisStatus === 'error' && (<Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Erro na Análise</AlertTitle><AlertDescription>{analysisError}</AlertDescription></Alert>)}
                    {analysisStatus === 'success' && analysisResult && (<div className="grid lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-8"><Card className="lg:col-span-1 shadow-primary-lg"><CardHeader className='items-center text-center'><CardTitle className="text-center font-headline text-lg text-primary">Nota de Viralização</CardTitle></CardHeader><CardContent className="text-center"><div className="text-4xl font-bold text-foreground">{numericNote}/10</div><p className="text-sm text-muted-foreground mt-2">{noteDescription}</p></CardContent></Card><Card className="lg:col-span-2 shadow-primary-lg"><CardHeader><CardTitle className="text-center items-center flex gap-2 justify-center"><Check className="h-5 w-5 text-primary" />Checklist de Melhorias</CardTitle></CardHeader><CardContent><ul className="space-y-3">{analysisResult.melhorias.map((item, index) => (<li key={index} className="flex items-start gap-3"><Check className="h-5 w-5 text-primary mt-0.5 shrink-0" /><span className="text-muted-foreground">{item.replace(/^✓\s*/, '')}</span></li>))}</ul></CardContent></Card></div>
                        <div className="space-y-8"><Card className="shadow-primary-lg"><CardHeader><CardTitle className="text-center font-headline text-lg flex items-center gap-2 justify-center"><Flame className="h-5 w-5 text-primary" />Análise de Retenção</CardTitle></CardHeader><CardContent className="space-y-4"><div><h4 className="font-semibold mb-1">Mapa de Calor Estimado</h4><p className="text-sm text-muted-foreground">{analysisResult.estimatedHeatmap}</p></div><div><h4 className="font-semibold mb-1">Análise Comparativa</h4><p className="text-sm text-muted-foreground">{analysisResult.comparativeAnalysis}</p></div></CardContent></Card><Card className="shadow-primary-lg"><CardHeader className='items-center text-center'><CardTitle className="text-center font-headline text-lg">Análise Detalhada</CardTitle></CardHeader><CardContent><Accordion type="single" collapsible defaultValue="item-1"><AccordionItem value="item-1"><AccordionTrigger>Análise do Gancho</AccordionTrigger><AccordionContent className="whitespace-pre-wrap">{analysisResult.gancho}</AccordionContent></AccordionItem><AccordionItem value="item-2"><AccordionTrigger>Análise do Conteúdo</AccordionTrigger><AccordionContent className="whitespace-pre-wrap">{analysisResult.conteudo}</AccordionContent></AccordionItem><AccordionItem value="item-3"><AccordionTrigger>Análise do CTA</AccordionTrigger><AccordionContent className="whitespace-pre-wrap">{analysisResult.cta}</AccordionContent></AccordionItem></Accordion></CardContent></Card></div>
                        </div>)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
        <Separator />

        <div className="space-y-6">
             <div className="text-center"><h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Análises Anteriores</h2><p className="text-muted-foreground">Aqui estão os últimos vídeos que você analisou.</p></div>
             <Card className="shadow-primary-lg">
                <CardContent className="pt-6">
                  <div className="min-h-[400px] flex flex-col">
                    {isLoadingAnalyses && (<div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>)}
                    
                    {!isLoadingAnalyses && paginatedAnalyses && paginatedAnalyses.length > 0 ? (
                      <ul className="space-y-4 flex-1">
                        {paginatedAnalyses.map(analise => (
                          <li key={analise.id}>
                              <div className="flex flex-col sm:flex-row items-center gap-4 p-2 rounded-lg hover:bg-muted">
                                  <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1">
                                    <Clapperboard className="h-6 w-6 text-primary shrink-0" />
                                    <div className="flex-1 text-center sm:text-left overflow-hidden">
                                        <p className="font-semibold text-foreground truncate">{analise.analysisName || analise.videoFileName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {analise.createdAt ? formatDistanceToNow(analise.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                                        </p>
                                    </div>
                                  </div>
                                  <Sheet>
                                      <SheetTrigger asChild>
                                          <Button variant="outline" size="sm" className="w-full mt-2 sm:mt-0 sm:w-auto">
                                              <Eye className="mr-2 h-4 w-4" /> Ver Análise
                                          </Button>
                                      </SheetTrigger>
                                      <SheetContent className="sm:max-w-4xl p-0">
                                          <SheetHeader className="p-6 border-b">
                                              <SheetTitle className="text-center font-headline text-2xl">
                                                  Análise de {analise.analysisName || analise.videoFileName}
                                              </SheetTitle>
                                          </SheetHeader>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                                              <div className="space-y-4">
                                                  <Card className="shadow-primary-lg">
                                                      <CardHeader><CardTitle className="text-lg text-primary text-center">Nota de Viralização</CardTitle></CardHeader>
                                                      <CardContent className="text-center">
                                                          <div className="text-3xl font-bold">{getNoteParts(analise.analysisData.geral).note}/10</div>
                                                          <p className="text-sm text-muted-foreground mt-1">{getNoteParts(analise.analysisData.geral).description}</p>
                                                      </CardContent>
                                                  </Card>
                                                  <Card className="shadow-primary-lg">
                                                      <CardHeader><CardTitle className="flex items-center gap-2 justify-center text-lg"><Check className="h-5 w-5 text-primary" /> Checklist de Melhorias</CardTitle></CardHeader>
                                                      <CardContent><ul className="space-y-2 text-sm">{analise.analysisData.melhorias.map((item: string, index: number) => (<li key={index} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0" /><span className="text-muted-foreground">{item.replace(/^✓\s*/, '')}</span></li>))}</ul></CardContent>
                                                  </Card>
                                              </div>
                                              <Card className="shadow-primary-lg">
                                                  <CardHeader><CardTitle className="text-center text-lg">Análise Detalhada</CardTitle></CardHeader>
                                                  <CardContent>
                                                      <Accordion type="single" collapsible defaultValue="item-1">
                                                          <AccordionItem value="item-1"><AccordionTrigger>Análise do Gancho</AccordionTrigger><AccordionContent>{analise.analysisData.gancho}</AccordionContent></AccordionItem>
                                                          <AccordionItem value="item-2"><AccordionTrigger>Análise do Conteúdo</AccordionTrigger><AccordionContent>{analise.analysisData.conteudo}</AccordionContent></AccordionItem>
                                                          <AccordionItem value="item-3"><AccordionTrigger>Análise do CTA</AccordionTrigger><AccordionContent>{analise.analysisData.cta}</AccordionContent></AccordionItem>
                                                      </Accordion>
                                                  </CardContent>
                                              </Card>
                                          </div>
                                      </SheetContent>
                                  </Sheet>
                              </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                     {!isLoadingAnalyses && (!paginatedAnalyses || paginatedAnalyses.length === 0) && (
                      <div className="flex-1 flex flex-col justify-center items-center text-center py-16 px-4 rounded-xl bg-muted/50 border border-dashed">
                        <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-foreground">Nenhuma análise anterior</h3>
                        <p className="text-sm text-muted-foreground">
                          Seus vídeos analisados aparecerão aqui.
                        </p>
                      </div>
                     )}
                  </div>

                  {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                          >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                              Página {currentPage} de {totalPages}
                          </span>
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                          >
                              Próxima
                              <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                      </div>
                  )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

    