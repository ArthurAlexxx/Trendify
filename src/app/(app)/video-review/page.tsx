
'use client';

import {
  Sparkles,
  UploadCloud,
  Video,
  Loader2,
  Save,
  FileVideo,
  XCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useState, useTransition, useCallback, useActionState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { useUser, useFirestore } from '@/firebase';
import { analyzeVideoAction } from './actions';
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

  const [state, formAction, isAnalyzing] = useActionState(analyzeVideoAction, null);
  const analysisResult = state?.data;
  const analysisError = state?.error;

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
    // A ação do useActionState não é limpa diretamente, mas ao submeter de novo
    // o estado será resetado pela nova ação. Se for preciso limpar visualmente
    // sem reenviar, seria necessário um state local adicional.
    // Por enquanto, o fluxo de resubmissão cuidará disso.
  };
  
  const handleSave = async (analysis: string) => {
    if (!user || !firestore || !file) return;

    startSavingTransition(async () => {
      try {
        const title = `Análise do vídeo: ${file.name.substring(0, 40)}`;
        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: analysis,
          origem: 'Análise de Vídeo',
          concluido: false,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Sucesso!',
          description: 'Sua análise foi salva no painel.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a análise. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const renderContent = () => {
    if (isAnalyzing) {
      return (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Analisando vídeo...</p>
          <p className="mt-1 text-sm text-muted-foreground">A IA está processando o conteúdo. Isso pode levar um minuto.</p>
        </div>
      );
    }

    if (analysisResult) {
      return (
        <div className="text-center space-y-6 animate-fade-in">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Análise da IA</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{analysisResult.analysis}</AlertDescription>
          </Alert>
          <div className="flex justify-center gap-4">
             <Button onClick={() => handleSave(analysisResult.analysis)} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Análise
            </Button>
            <Button onClick={handleReset} variant="outline">
              Analisar Outro Vídeo
            </Button>
          </div>
        </div>
      );
    }

     if (analysisError) {
      return (
        <div className="text-center space-y-4 animate-fade-in">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erro na Análise</AlertTitle>
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
          <Button onClick={handleReset} variant="secondary">
            Tentar Novamente
          </Button>
        </div>
      );
    }

    return (
      <form action={formAction} className="space-y-6">
        <div
          {...getRootProps()}
          className={`relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'
          } ${file ? 'border-solid border-primary' : ''}`}
        >
          <input {...getInputProps()} />
          
          {file ? (
             <>
                <FileVideo className="h-12 w-12 text-primary mb-2" />
                <p className="font-semibold text-foreground">{file.name}</p>
             </>
          ) : (
            <>
              <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="font-semibold">
                {isDragActive ? 'Pode soltar o vídeo!' : 'Arraste e solte seu vídeo aqui'}
              </p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </>
          )}

          <input type="hidden" name="videoDataUri" value={videoDataUri} />
        </div>
        
        <Button
          type="submit"
          disabled={isAnalyzing || !videoDataUri}
          size="lg"
          className="font-manrope w-full h-12 text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Analisar Vídeo
        </Button>
      </form>
    );
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
      
      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl max-w-2xl mx-auto">
        <CardContent className="p-6 sm:p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
