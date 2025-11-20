'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Captions,
  Clapperboard,
  Lightbulb,
  List,
  Loader2,
  Star,
  Sparkles,
  Save,
  UploadCloud,
  FileVideo,
  X,
} from 'lucide-react';
import { useEffect, useActionState, useTransition, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getVideoReviewAction, VideoReviewOutput } from './actions';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  videoDataUri: z.string().min(1, 'O upload do vídeo é obrigatório.'),
});

export default function VideoReviewPage() {
  const { toast } = useToast();
  const [state, formAction, isGenerating] = useActionState(
    getVideoReviewAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      videoDataUri: '',
    },
  });

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file) {
        if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            if (video.duration > 60) {
              toast({
                title: 'Vídeo muito longo',
                description: 'Por favor, selecione um vídeo com até 1 minuto de duração.',
                variant: 'destructive',
              });
              return;
            }
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              form.setValue('videoDataUri', reader.result as string);
            };
          };
          video.src = URL.createObjectURL(file);
        } else {
          toast({
            title: 'Arquivo inválido',
            description: 'Por favor, selecione um arquivo de vídeo.',
            variant: 'destructive',
          });
        }
      }
    },
    [form, toast]
  );
  
  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    form.reset();
  }

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        handleFileChange(event.dataTransfer.files[0]);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };
  

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro na Análise',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    if (isGenerating) {
       setUploadProgress(0);
       progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval!);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
    } else if (state?.data) {
      if(progressInterval) clearInterval(progressInterval);
      setUploadProgress(100);
    } else if (state?.error) {
      if(progressInterval) clearInterval(progressInterval);
      setUploadProgress(0);
    }
    return () => {
      if(progressInterval) clearInterval(progressInterval);
    };
  }, [isGenerating, state]);

  const handleSave = (data: VideoReviewOutput) => {
    if (!user || !firestore) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para salvar.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const title = `Análise de Vídeo: Score ${data.score}/100`;
        const content = `**Sugestões de Gancho:**\n- ${data.hookSuggestions.join(
          '\n- '
        )}\n\n**Ritmo:**\n${data.pacingSuggestions}\n\n**Legenda:**\n${
          data.caption
        }`;

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
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a análise. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const result = state?.data;

  const scoreColor =
    result && result.score > 75
      ? 'text-green-500 bg-green-500/10 border-green-500/20'
      : result && result.score > 50
      ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      : 'text-red-500 bg-red-500/10 border-red-500/20';

  return (
    <div className="space-y-12">
      <PageHeader
        title="Análise de Vídeo com IA"
        description="Receba um diagnóstico completo e sugestões para viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>

       <form action={formAction}>
        <input type="hidden" {...form.register('videoDataUri')} />
        <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-headline text-xl">
              <UploadCloud className="h-6 w-6 text-primary" />
              <span>Faça o upload do seu vídeo (até 1 min)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {videoPreview ? (
              <div className='w-full aspect-video rounded-xl overflow-hidden relative'>
                <video src={videoPreview} controls className="w-full h-full object-cover" />
                 <Button onClick={clearVideo} variant="destructive" size="icon" className="absolute top-3 right-3 h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                 </Button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={cn(
                  'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <FileVideo className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-foreground">
                      <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-muted-foreground">MP4, MOV, WEBM (Máx. 1 minuto)</p>
                  </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}

            {isGenerating && (
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>Analisando seu vídeo...</p>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              type="submit"
              disabled={isGenerating || !videoFile}
              size="lg"
              className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Analisar Vídeo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {(result) && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className='flex-1'>
              <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
                Diagnóstico da IA
              </h2>
              <p className="text-muted-foreground">
                Um diagnóstico completo para otimizar seu conteúdo.
              </p>
            </div>
            {result && (
              <div className="flex w-full sm:w-auto gap-2">
                <Button
                  onClick={() => handleSave(result)}
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
            )}
          </div>

          <div className="grid gap-8">
            <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-primary" />
                    <span>Pontuação de Viralização</span>
                  </div>
                  <Badge
                    className={`text-xl font-bold rounded-lg px-4 py-1 border ${scoreColor}`}
                  >
                    {result.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground max-w-2xl">
                  Esta pontuação reflete o potencial de engajamento do seu
                  vídeo com base em mais de 50 fatores de sucesso, incluindo
                  tendências e melhores práticas atuais.
                </p>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <InfoList
                title="Sugestões de Gancho"
                icon={Lightbulb}
                items={result.hookSuggestions}
              />
              <InfoList
                title="Variações de Roteiro"
                icon={List}
                items={result.scriptVariations}
              />
            </div>
            <InfoCard
              title="Sugestões de Ritmo"
              icon={Clapperboard}
              content={result.pacingSuggestions}
            />
            <InfoCard
              title="Legenda Otimizada"
              icon={Captions}
              content={result.caption}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  content,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
}) {
  return (
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={content}
          className="h-40 bg-muted/30 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}

function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card rounded-2xl h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-4 rounded-xl bg-muted/30 border"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
