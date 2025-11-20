
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
import { Sparkles, UploadCloud, Loader2, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';


function PremiumFeatureGuard({ children }: { children: React.ReactNode }) {
    const { subscription, isLoading } = useSubscription();
    const router = useRouter();
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (!isLoading && (!subscription || (subscription.plan !== 'pro' && subscription.plan !== 'premium'))) {
            setShowAlert(true);
        }
    }, [isLoading, subscription, router]);
    
    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (showAlert) {
        return (
             <AlertDialog open={true} onOpenChange={(open) => !open && router.push('/dashboard')}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Funcionalidade do Plano Pro</AlertDialogTitle>
                  <AlertDialogDescription>
                    A Análise de Vídeo é um recurso exclusivo para assinantes dos planos Pro e Premium. Faça o upgrade para ter acesso!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push('/subscribe')}>Ver Planos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )
    }
    
    if (subscription && (subscription.plan === 'pro' || subscription.plan === 'premium')) {
        return <>{children}</>;
    }

    return null;
}


export default function VideoReviewPage() {
    return (
        <PremiumFeatureGuard>
            <VideoReviewPageContent />
        </PremiumFeatureGuard>
    )
}


function VideoReviewPageContent() {
  const [videoLink, setVideoLink] = useState('');
  const { toast } = useToast();

  const handleAnalyze = () => {
    toast({
      title: "Funcionalidade em Breve",
      description: "A análise de vídeo com IA está sendo aprimorada e será reativada em breve. Agradecemos sua paciência.",
    });
  };

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
              <LinkIcon className="h-6 w-6 text-primary" />
              <span>Cole o link do seu vídeo</span>
            </CardTitle>
            <CardDescription>
                Insira o link de um vídeo do Instagram (Reels) ou TikTok para análise.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
             <div className="flex gap-2">
                <Input 
                    type="url"
                    placeholder="https://www.instagram.com/reels/..."
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="h-12 text-base"
                />
             </div>

            <Button
              onClick={handleAnalyze}
              disabled={!videoLink}
              size="lg"
              className="font-manrope w-full sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Analisar Vídeo
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
