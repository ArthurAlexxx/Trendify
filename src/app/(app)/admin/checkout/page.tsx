'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminCheckoutTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [product, setProduct] = useState('Plano Premium Mensal');
  const [amount, setAmount] = useState('39.00');

  const handleCheckout = () => {
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: 'Pagamento de Teste Aprovado',
        description: `O pagamento de R$ ${amount} para "${product}" foi processado.`,
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checkout de Teste"
        description="Esta é uma página para testar o fluxo de pagamento (simulado)."
        icon={CreditCard}
      />

      <Card className="max-w-md mx-auto shadow-primary-lg">
        <CardHeader>
          <CardTitle>Simular Pagamento</CardTitle>
          <CardDescription>Insira os detalhes para simular uma transação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product">Nome do Produto</Label>
            <Input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11"
            />
          </div>
          <Button onClick={handleCheckout} disabled={isLoading} className="w-full h-11">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pagar R$ {amount}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
