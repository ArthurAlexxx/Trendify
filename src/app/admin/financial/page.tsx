'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function FinancialAdminPage() {

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios Financeiros"
        description="Visualize as métricas financeiras e assinaturas da plataforma."
      />

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral Financeira</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="text-center py-20 px-4 rounded-xl bg-muted/50 border border-dashed">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground">
                  Página em Construção
                </h3>
                <p className="text-sm text-muted-foreground">
                  Os relatórios financeiros e de assinaturas aparecerão aqui em breve.
                </p>
              </div>
        </CardContent>
      </Card>
    </div>
  );
}
