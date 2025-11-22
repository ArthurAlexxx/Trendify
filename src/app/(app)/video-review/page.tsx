
'use client';

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
  XCircle,
} from 'lucide-react';
import {
  useState,
  useTransition,
  useCallback,
  useActionState,
  useRef,
} from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { useUser, useFirestore } from '@/firebase';
import { analyzeVideoAction, VideoAnalysisOutput } from './actions';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VideoReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoDataUri, setVideoDataUri] = useState<string>('');
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [state, formAction, isAnalyzing] = useActionState(
    analyzeVideoAction,
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoDataUri(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      toast({
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo de vídeo válido.',
        variant: 'destructive',
      });
    }
  }, [toast]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'video/*': ['.mp4', '.mov', '.webm'] },
  });

  const handleReset = () => {
    setFile(null);
    setVideoDataUri('');
    // Apenas para limpar o estado visual, o 'state' do useActionState será resetado na próxima ação
  };
  
  const handleSave = async (result: VideoAnalysisOutput) => {
    if (!user || !firestore || !result || !file) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a análise.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const title = `Análise do vídeo: ${file.name.substring(0, 40)}`;
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

  const analysisResult = state?.data;
  const analysisError = state?.error;

  const renderInitialOrSelected = () => {
    if (!file) {
      return (
        <Card
          {...getRootProps()}
          className={`shadow-lg shadow-primary/5 border-dashed border-border/50 bg-card rounded-2xl max-w-2xl mx-auto cursor-pointer hover:border-primary transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border'
          }`}
        >
          <input {...getInputProps()} ref={fileInputRef} />
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
              MP4, MOV, WEBM (Máx 50MB)
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
        <CardContent className="p-6 space-y-6 flex flex-col items-center">
          <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg w-full">
            <FileVideo className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-sm text-muted-foreground truncate">
              {file.name}
            </p>
          </div>
           <form action={formAction} className="w-full flex flex-col sm:flex-row gap-4">
              <input type="hidden" name="videoDataUri" value={videoDataUri} />
              <Button
                type="submit"
                disabled={isAnalyzing || !videoDataUri}
                size="lg"
                className="font-manrope w-full h-11 px-10 rounded-md text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
              >
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                Analisar Vídeo
              </Button>
              <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto h-11" type="button">
                Cancelar
              </Button>
           </form>
        </CardContent>
      </Card>
    );
  };

  const renderAnalysis = () => {
    if (isAnalyzing) {
       return (
          <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
            <CardContent className="p-6 space-y-6 flex flex-col items-center">
              <div className="flex items-center gap-2 text-primary font-semibold animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  Analisando seu vídeo com IA... (Isso pode levar um minuto)
                </span>
              </div>
            </CardContent>
          </Card>
        );
    }
    
    if (analysisResult) {
       return (
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
                onClick={() => handleSave(analysisResult)}
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
                  content={analysisResult.hookAnalysis}
                  icon={Target}
                />
                <AnalysisSection
                  title="Análise do Conteúdo"
                  content={analysisResult.contentAnalysis}
                  icon={Video}
                />
                <AnalysisSection
                  title="Análise do CTA (Call to Action)"
                  content={analysisResult.ctaAnalysis}
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
                      {analysisResult.overallScore}
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
                      {analysisResult.improvementPoints.map((point, i) => (
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
            <div className="text-center">
              <Button onClick={handleReset} variant="outline" type="button">
                Analisar Outro Vídeo
              </Button>
            </div>
          </div>
        );
    }

    if (analysisError) {
        return (
          <Card className="shadow-lg shadow-destructive/5 border-destructive/20 bg-card rounded-2xl max-w-2xl mx-auto">
            <CardContent className="p-6 text-center space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro na Análise</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
              <Button onClick={handleReset} variant="secondary" type="button">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        );
    }
    
    return null;
  };

  return (
    <div className="space-y-12">
      <PageHeader
        icon={<Video />}
        title="Diagnóstico de Vídeo com IA"
        description="Receba uma análise completa e sugestões para otimizar e viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>
      
      {!file && renderInitialOrSelected()}
      {file && !analysisResult && !analysisError && !isAnalyzing && renderInitialOrSelected()}

      {(isAnalyzing || analysisResult || analysisError) && renderAnalysis()}
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
      <p className="text-muted-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}
