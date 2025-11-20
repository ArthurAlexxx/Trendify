'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Sparkles, UploadCloud } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideoReviewPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Análise de Vídeo com IA"
        description="Receba um diagnóstico completo e sugestões para viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>

      <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-headline text-xl">
              <UploadCloud className="h-6 w-6 text-primary" />
              <span>Faça o upload do seu vídeo (até 1 min)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
             <div
                className='relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-not-allowed bg-muted/50'
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-foreground">
                      <span className="font-semibold">Funcionalidade em manutenção</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Estamos trabalhando para melhorar a análise de vídeo.</p>
                  </div>
              </div>

            <Button
              type="submit"
              disabled={true}
              size="lg"
              className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Analisar Vídeo
            </Button>
          </CardContent>
        </Card>

      {isMounted && (
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Funcionalidade em Manutenção</AlertDialogTitle>
              <AlertDialogDescription>
                A análise de vídeo com IA está passando por melhorias e será reativada em breve. Agradecemos a sua compreensão!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                // This is a bit of a hack to "close" it visually, 
                // but since it's controlled by `open={true}` it will just re-appear.
                // For a temporary notice, this is acceptable.
              }}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
