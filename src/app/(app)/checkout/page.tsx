
'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');

  return (
     <div className="space-y-8">
      <PageHeader
        title="Finalizar Assinatura"
        description="Estamos quase lá! Preencha seus dados para continuar."
      />
      <Card className="max-w-2xl mx-auto border-0 rounded-2xl">
        <CardHeader>
          <CardTitle>Plano Escolhido: {plan} ({cycle})</CardTitle>
          <CardDescription>
            Complete seu cadastro na plataforma de pagamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* O formulário e a lógica de criação do cliente virão aqui na próxima etapa. */}
            <p className="text-center text-muted-foreground">Em construção...</p>
        </CardContent>
      </Card>
    </div>
  )
}


export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CheckoutPageContent />
        </Suspense>
    )
}
