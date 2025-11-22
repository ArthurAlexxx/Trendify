
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import {
  Sparkles,
  UploadCloud,
  Video,
  Loader2,
  ThumbsUp,
  Lightbulb,
  Target,
  Check,
  Save,
  FileVideo,
} from 'lucide-react';
import { useState, useActionState, useEffect, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { initializeFirebase, useUser } from '@/firebase';
import {
  analyzeVideoAction,
  checkAnalysisStatus,
  VideoAnalysisOutput,
} from './actions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useSearchParams, useRouter } from 'next/navigation';

function usePollAnalysis(operationId: string | null) {
  const [result, setResult] = useState<{
    done: boolean;
    result?: VideoAnalysisOutput;
    error?: any;
  } | null>(null);

  useEffect(() => {
    if (!operationId) {
      setResult(null);
      return;
    }

    let isCancelled = false;
    const poll = async () => {
      while (!isCancelled) {
        try {
          const status = await checkAnalysisStatus(operationId);
          if (status.done) {
            setResult(status);
            isCancelled = true;
            break;
          }
        } catch (e) {
          console.error('Polling failed', e);
          setResult({ done: true, error: e });
          isCancelled = true;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };

    poll();

    return () => {
      isCancelled = true;
    };
  }, [operationId]);

  return result;
}

export default function VideoReviewPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const operationId = searchParams.get('operationId');
  const analysisResult = usePollAnalysis(operationId);

  const [state, formAction, isAnalyzing] = useActionState(
    analyzeVideoAction,
    null
  );

  useEffect(() => {
    if (state?.operationId && !operationId) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('operationId', state.operationId);
      router.push(`?${newParams.toString()}`);
    }
    if (state?.error) {
      console.error("Erro na ação de análise:", state.error);
      toast({
        title: 'Erro na Análise',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, operationId, router, searchParams, toast]);

  useEffect(() => {
    if (analysisResult?.error) {
      console.error("Erro ao processar o resultado da análise:", analysisResult.error);
      toast({
        title: 'Erro ao Processar Análise',
        description:
          analysisResult.error.message ||
          'Falha ao obter o resultado da análise.',
        variant: 'destructive',
      });
       // Clear the operationId from URL to allow retry
      router.push('/video-review');
    }
  }, [analysisResult, toast, router]);

  const handleUpload = () => {
    if (!videoFile || !user) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    const storage = getStorage(initializeFirebase().firebaseApp);
    const storageRef = ref(
      storage,
      `video-reviews/${user.uid}/${Date.now()}-${videoFile.name}`
    );
    const uploadTask = uploadBytesResumable(storageRef, videoFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        setUploadProgress(null);
        setIsUploading(false);
        toast({
          title: 'Erro no Upload',
          description: `Não foi possível enviar seu vídeo. (${error.code})`,
          variant: 'destructive',
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setIsUploading(false);
          setVideoUrl(downloadURL);
          toast({
            title: 'Upload Concluído!',
            description: 'Seu vídeo foi enviado. Agora clique em "Analisar Vídeo".',
          });
        });
      }
    );
  };


  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(null); // Reset URL when new file is dropped
      setUploadProgress(null);
      router.push('/video-review'); // Reset URL
    } else {
      toast({
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo de vídeo.',
        variant: 'destructive',
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'video/*': [] },
  });


  const handleSave = async (result: VideoAnalysisOutput) => {
    if (!user || !firestore || !result || !videoFile) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a análise.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const title = `Análise do vídeo: ${videoFile.name.substring(0, 40)}`;
        const {
          overallScore,
          hookAnalysis,
          contentAnalysis,
          ctaAnalysis,
          improvementPoints,
        } = result;

        let content = `**Nota Geral:** ${overallScore}/10\n\n`;
        content += `**Análise do Gancho:**\n${hookAnalysis}\n\n`;
        content += `**Análise do Conteúdo:**\n${contentAnalysis}\n\n`;
        content += `**Análise do CTA:**\n${ctaAnalysis}\n\n`;
        content += `**Pontos de Melhoria:**\n${improvementPoints
          .map((point) => `- ${point}`)
          .join('\n')}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Análise de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua análise foi salva no painel.',
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

  const finalResult = analysisResult?.result;
  const isCurrentlyPolling = operationId && !analysisResult?.done;

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<Video />}
        title="Diagnóstico de Vídeo com IA"
        description="Receba uma análise completa e sugestões para otimizar e viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>

      {/* Initial State: No file, no operation */}
      {!videoFile && !operationId && (
        <Card
          {...getRootProps()}
          className="shadow-lg shadow-primary/5 border-dashed border-border/50 bg-card rounded-2xl max-w-2xl mx-auto cursor-pointer hover:border-primary transition-colors"
        >
          <input {...getInputProps()} />
          <CardContent className="p-8 text-center">
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">
              {isDragActive
                ? 'Pode soltar o vídeo!'
                : 'Arraste e solte seu vídeo aqui'}
            </h3>
            <p className="text-muted-foreground">
              ou clique para selecionar o arquivo
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              MP4, MOV, WEBM - até 100MB
            </p>
          </CardContent>
        </Card>
      )}

      {/* Uploading or Ready to Analyze State */}
      {videoFile && !finalResult && !isAnalyzing && !isCurrentlyPolling && (
        <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
          <CardContent className="p-6 space-y-6 flex flex-col items-center">
            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg w-full">
              <FileVideo className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-sm text-muted-foreground truncate">
                {videoFile.name}
              </p>
            </div>
            
            {uploadProgress !== null && (
              <div className="w-full space-y-2 text-center">
                <Progress value={uploadProgress} />
                <p className="text-sm text-primary">
                  {isUploading ? `Enviando... ${Math.round(uploadProgress)}%` : `Upload concluído!`}
                </p>
              </div>
            )}
            
            <div className="w-full flex flex-col sm:flex-row gap-4">
                <Button onClick={handleUpload} disabled={isUploading || !!videoUrl} className="w-full sm:w-1/2">
                   {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                   {videoUrl ? 'Enviado' : '1. Enviar Vídeo'}
                </Button>
                <form action={formAction} className="w-full sm:w-1/2">
                    <input type="hidden" name="videoUrl" value={videoUrl || ''} />
                    <Button
                        type="submit"
                        disabled={!videoUrl || isAnalyzing || isUploading}
                        size="lg"
                        className="font-manrope w-full h-10 px-10 rounded-md text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                    >
                        <Sparkles className="mr-2 h-5 w-5" />
                        2. Analisar Vídeo
                    </Button>
                </form>
            </div>

          </CardContent>
        </Card>
      )}
      
      {/* Polling/Analyzing State */}
      {(isAnalyzing || isCurrentlyPolling) && (
         <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
          <CardContent className="p-6 space-y-6 flex flex-col items-center">
            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg w-full">
              <FileVideo className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-sm text-muted-foreground truncate">
                Análise em andamento...
              </p>
            </div>
             <div className="flex items-center gap-2 text-primary font-semibold animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  Analisando seu vídeo com IA... (Isso pode levar um minuto)
                </span>
              </div>
          </CardContent>
        </Card>
      )}


      {/* Analysis Result State */}
      {finalResult && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Resultado da Análise
              </h2>
              <p className="text-muted-foreground">
                Aqui está o diagnóstico do seu vídeo.
              </p>
            </div>
            <Button
              onClick={() => handleSave(finalResult)}
              disabled={isSaving}
              className="w-full sm:w-auto rounded-full font-manrope"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Análise
            </Button>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-2 shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl p-6 space-y-6">
              <AnalysisSection
                title="Análise do Gancho (Hook)"
                content={finalResult.hookAnalysis}
                icon={Target}
              />
              <AnalysisSection
                title="Análise do Conteúdo"
                content={finalResult.contentAnalysis}
                icon={Video}
              />
              <AnalysisSection
                title="Análise do CTA (Call to Action)"
                content={finalResult.ctaAnalysis}
                icon={ThumbsUp}
              />
            </Card>
            <div className="space-y-6">
              <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold text-muted-foreground mb-2">
                    Nota Geral
                  </h3>
                  <p className="text-6xl font-bold font-headline text-primary">
                    {finalResult.overallScore}
                    <span className="text-2xl text-muted-foreground">/10</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold text-center flex items-center justify-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" /> Pontos de
                    Melhoria
                  </h3>
                  <ul className="space-y-2 text-sm text-left">
                    {finalResult.improvementPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisSection({
  icon: Icon,
  title,
  content,
}: {
  icon: React.ElementType;
  title: string;
  content: string;
}) {
  return (
    <div className="text-left">
      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h3>
      <p className="text-muted-foreground">{content}</p>
    </div>
  );
}
