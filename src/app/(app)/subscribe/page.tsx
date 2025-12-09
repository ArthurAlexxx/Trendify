
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, Star, Crown } from 'lucide-react';
import Link from 'next/link';


export default function SubscribePage() {

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planos de Assinatura"
        description="Acesso total temporariamente liberado para todos os usuários."
        icon={Crown}
      />
      
        <div className="grid md:grid-cols-1 gap-8 items-start max-w-2xl mx-auto">
            <Card className="rounded-2xl border-0 flex flex-col h-full shadow-primary-lg">
                <CardHeader className='text-center'>
                    <CardTitle className="font-headline text-xl flex items-center gap-2 justify-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    Acesso Total Liberado
                    </CardTitle>
                    <CardDescription>Todas as funcionalidades da plataforma estão disponíveis para você.</CardDescription>
                </CardHeader>
                <CardContent className='flex-grow'>
                    <ul className="space-y-3 text-sm text-foreground">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <span>Gerações de conteúdo <b>ilimitadas</b></span>
                        </li>
                         <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <span><b>Sincronização automática</b> de métricas</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <span>Análise de Vídeo</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <span>Assistente de Propostas para Publis</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <span>Gerador de Mídia Kit profissional</span>
                        </li>
                    </ul>
                </CardContent>
                 <CardFooter>
                    <Button asChild className="w-full" disabled>
                        <Link href={`/dashboard`}>Acesso já concedido</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
