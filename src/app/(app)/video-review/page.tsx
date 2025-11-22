
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

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

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

export default function VideoReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, startSavingTransition] = useTransition();

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisResult, setAnalysisResult] =
    useState<VideoAnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string>('');

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      resetState();
    } else {
      toast({
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo de vídeo válido.',
        variant: 'destructive',
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => handleFileSelect(acceptedFiles[0]),
    multiple: false,
    accept: { 'video/*': ['.mp4', '.mov', '.webm'] },
  });

  const resetState = () => {
    setAnalysisStatus('idle');
    setAnalysisResult(null);
    setAnalysisError('');
  };

  const handleReset = () => {
    setFile(null);
    resetState();
  };

  const handleAnalyzeVideo = async () => {
    if (!file) {
      setAnalysisError('Nenhum arquivo de vídeo selecionado.');
      setAnalysisStatus('error');
      return;
    }

    setAnalysisStatus('loading');
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const result = await analyzeVideoAction({ videoDataUri: base64data });

        if (result.data) {
          setAnalysisResult(result.data);
          setAnalysisStatus('success');
          toast({
            title: 'Análise Concluída',
            description: 'A IA analisou o seu vídeo.',
          });
        } else if (result.error) {
           throw new Error(result.error);
        } else {
          throw new Error('A análise não produziu um resultado.');
        }
      };
      reader.onerror = () => {
        throw new Error('Falha ao ler o arquivo de vídeo.');
      };
    } catch (e: any) {
      console.error('Erro na análise:', e);
      const errorMsg =
        e.message || 'Ocorreu um erro desconhecido durante a análise.';
      setAnalysisError(errorMsg);
      setAnalysisStatus('error');
      toast({
        title: 'Falha na Análise',
        description: errorMsg,
        variant: 'destructive',
      });
    }
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

  const renderInitialOrSelected = () => {
    if (!file) {
      return (
        <Card
          {...getRootProps()}
          className={`shadow-lg shadow-primary/5 border-dashed border-border/50 bg-card rounded-2xl max-w-2xl mx-auto cursor-pointer hover:border-primary transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border'
          }`}
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
              MP4, MOV, WEBM
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
          <div className="w-full flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleAnalyzeVideo}
              disabled={analysisStatus === 'loading'}
              size="lg"
              className="font-manrope w-full h-11 px-10 rounded-md text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
              {analysisStatus === 'loading' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              Analisar Vídeo
            </Button>
            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto h-11">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAnalysis = () => {
    switch (analysisStatus) {
      case 'loading':
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
      case 'success':
        if (!analysisResult) return null;
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
              <Button onClick={handleReset} variant="outline">
                Analisar Outro Vídeo
              </Button>
            </div>
          </div>
        );
      case 'error':
        return (
          <Card className="shadow-lg shadow-destructive/5 border-destructive/20 bg-card rounded-2xl max-w-2xl mx-auto">
            <CardContent className="p-6 text-center space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro na Análise</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
              <Button onClick={handleReset} variant="secondary">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
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

      {analysisStatus === 'idle'
        ? renderInitialOrSelected()
        : renderAnalysis()}
    </div>
  );
}

    