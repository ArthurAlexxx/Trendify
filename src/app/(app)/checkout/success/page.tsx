
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, LayoutDashboard, Loader2 } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';

function SuccessPageContent() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-background p-4 relative">
      {isClient && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />}
      
      <Card className="w-full max-w-lg text-center shadow-primary-lg border-0 rounded-2xl p-4 sm:p-8">
        <CardHeader>
          <div className="mx-auto h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border-2 border-green-500/20">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="font-headline text-3xl">Pagamento Aprovado!</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Seu plano foi atualizado. Bem-vindo(a) à experiência completa da Trendify!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full h-12 text-base" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={ <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }>
            <SuccessPageContent />
        </Suspense>
    )
}
