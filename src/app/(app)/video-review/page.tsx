
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Sparkles, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function VideoReviewPage() {
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
        title="Diagnóstico de Vídeo com IA"
        description="Receba uma análise completa e sugestões para otimizar e viralizar seu vídeo."
      >
        <SavedIdeasSheet />
      </PageHeader>

      <Card className="shadow-lg shadow-primary/5 border-border/30 bg-card rounded-2xl max-w-2xl mx-auto">
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="flex items-center justify-center sm:justify-start gap-3 font-headline text-xl">
              <LinkIcon className="h-6 w-6 text-primary" />
              <span>Cole o link do seu vídeo</span>
            </CardTitle>
            <CardDescription>
                Insira o link de um vídeo do Instagram (Reels) ou TikTok para análise.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6 flex flex-col items-center'>
             <div className="flex gap-2 w-full">
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
