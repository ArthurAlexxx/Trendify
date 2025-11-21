
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
} from 'lucide-react';
import { useState, useActionState, useTransition, useCallback } from 'react';
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
import { analyzeVideoAction, VideoAnalysisOutput } from './actions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function VideoReviewPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [state, formAction, isAnalyzing] = useActionState(
    analyzeVideoAction,
    null
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      // Reset state when a new file is dropped
      setUploadProgress(null);
    } else {
      toast({
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo de vídeo.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'video/*': [] },
  });

  const handleAnalyze = () => {
    if (!videoFile || !user) return;

    setIsUploading(true);
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
          const formData = new FormData();
          formData.append('videoUrl', downloadURL);
          formAction(formData);
        });
      }
    );
  };
  
  const handleSave = () => {
    if (!user || !firestore || !state?.data || !videoFile) {
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
        const { overallScore, hookAnalysis, contentAnalysis, ctaAnalysis, improvementPoints } = state.data;
        
        let content = `**Nota Geral:** ${overallScore}/10\n\n`;
        content += `**Análise do Gancho:**\n${hookAnalysis}\n\n`;
        content += `**Análise do Conteúdo:**\n${contentAnalysis}\n\n`;
        content += `**Análise do CTA:**\n${ctaAnalysis}\n\n`;
        content += `**Pontos de Melhoria:**\n${improvementPoints.map(point => `- ${point}`).join('\n')}`;

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

  const result = state?.data;

  const renderInitialState = () => (
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
        <p className="text-muted-foreground">ou clique para selecionar o arquivo</p>
        <p className="text-xs text-muted-foreground mt-4">
          MP4, MOV, WEBM - até 100MB
        </p>
      </CardContent>
    </Card>
  );

  const renderPreviewAndUpload = () => (
    videoFile && (
      <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
        <CardContent className="p-6 space-y-6 flex flex-col items-center">
          <video
            src={URL.createObjectURL(videoFile)}
            controls
            className="w-full max-h-80 rounded-lg"
          />
          <p className="font-semibold text-sm text-muted-foreground">
            {videoFile.name}
          </p>
          {isUploading && uploadProgress !== null && (
            <div className="w-full space-y-2 text-center">
              <Progress value={uploadProgress} />
              <p className="text-sm text-primary">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analisando seu vídeo com IA...</span>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isUploading || isAnalyzing || !videoFile}
            size="lg"
            className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Analisar Vídeo
          </Button>
        </CardContent>
      </Card>
    )
  );
    
  const renderAnalysisResult = () => (
    result && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center">
                <div className='flex-1'>
                  <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da Análise</h2>
                  <p className="text-muted-foreground">Aqui está o diagnóstico do seu vídeo.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Análise
                </Button>
              </div>
            <div className="grid lg:grid-cols-3 gap-6 items-start">
                <Card className="lg:col-span-2 shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl p-6 space-y-6">
                    <AnalysisSection title="Análise do Gancho (Hook)" content={result.hookAnalysis} icon={Target}/>
                    <AnalysisSection title="Análise do Conteúdo" content={result.contentAnalysis} icon={Video}/>
                    <AnalysisSection title="Análise do CTA (Call to Action)" content={result.ctaAnalysis} icon={ThumbsUp}/>
                </Card>
                <div className="space-y-6">
                    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                        <CardContent className="p-6 text-center">
                            <h3 className="font-semibold text-muted-foreground mb-2">Nota Geral</h3>
                            <p className="text-6xl font-bold font-headline text-primary">{result.overallScore}<span className="text-2xl text-muted-foreground">/10</span></p>
                        </CardContent>
                    </Card>
                     <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
                        <CardContent className="p-6 space-y-3">
                            <h3 className="font-semibold text-center flex items-center justify-center gap-2"><Lightbulb className="h-5 w-5 text-primary"/> Pontos de Melhoria</h3>
                            <ul className="space-y-2 text-sm text-left">
                                {result.improvementPoints.map((point, i) => (
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
    )
  );

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<Video />}
        title="Diagnóstico de Vídeo com IA"
        description="Receba uma análise completa e sugestões para otimizar e viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>

      {!videoFile && !result && renderInitialState()}
      {videoFile && !result && renderPreviewAndUpload()}
      {result && renderAnalysisResult()}

    </div>
  );
}


function AnalysisSection({ icon: Icon, title, content }: { icon: React.ElementType, title: string, content: string }) {
    return (
        <div className='text-left'>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </h3>
            <p className="text-muted-foreground">{content}</p>
        </div>
    )
}
