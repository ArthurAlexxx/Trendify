'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { PlanoSemanal } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { History, Eye, Inbox, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { Separator } from './ui/separator';
import { useState } from 'react';

const chartConfig = {
  alcance: { label: 'Alcance', color: 'hsl(var(--primary))' },
  engajamento: { label: 'Engajamento', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;


export function PreviousPlansSheet() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedPlan, setSelectedPlan] = useState<PlanoSemanal | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  const previousPlansQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `users/${user.uid}/weeklyPlans`),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore, user]
  );
  const { data: previousPlans, isLoading } =
    useCollection<PlanoSemanal>(previousPlansQuery);
    
  const handleViewDetails = (plan: PlanoSemanal) => {
    setSelectedPlan(plan);
    setIsDetailSheetOpen(true);
  }

  return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Planos Anteriores
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className='p-6 pb-4 border-b'>
          <SheetTitle className="font-headline text-xl">Planos Anteriores</SheetTitle>
          <SheetDescription>
            Acesse aqui todos os planejamentos que você já gerou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-6 space-y-4">
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && previousPlans && previousPlans.length > 0 && (
              <ul className="space-y-4">
                {previousPlans.filter(p => p.createdAt).map((plan) => (
                  <li key={plan.id}>
                    <div className="border p-4 rounded-xl hover:border-primary/50 transition-colors">
                      <p className="font-semibold text-foreground break-words mb-2">
                        Plano de {format(plan.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                       <div className='flex justify-between items-center'>
                         <p className="text-xs text-muted-foreground">
                            {plan.items.length} tarefas
                         </p>
                        <Button variant="ghost" size="sm" className='h-8' onClick={() => handleViewDetails(plan)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                        </Button>
                       </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!isLoading && (!previousPlans || previousPlans.length === 0) && (
              <div className="text-center py-20 px-4 rounded-xl bg-muted/50 border border-dashed">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground">
                  Nenhum plano anterior
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gere seu primeiro plano de conteúdo semanal.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {selectedPlan && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col">
                <SheetHeader className='p-6 pb-4 border-b'>
                    <SheetTitle className="font-headline text-2xl">
                    Detalhes do Plano - {selectedPlan.createdAt && format(selectedPlan.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                    </SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className='border-0 shadow-none'>
                        <CardHeader><CardTitle>Roteiro de Conteúdo</CardTitle></CardHeader>
                        <CardContent>
                        <ul className="space-y-2">
                        {selectedPlan.items.map((item, index) => (
                            <li key={index}>
                            <div className="p-2 rounded-lg">
                                <div>
                                <p className={'font-medium text-base text-foreground'}>
                                    <span className="font-semibold text-primary">{item.dia}:</span> {item.tarefa}
                                </p>
                                <p className="text-sm text-muted-foreground">{item.detalhes}</p>
                                </div>
                            </div>
                            {index < selectedPlan.items.length - 1 && <Separator className="my-2" />}
                            </li>
                        ))}
                        </ul>
                        </CardContent>
                    </Card>
                    <Card className='border-0 shadow-none'>
                        <CardHeader><CardTitle>Simulação de Desempenho</CardTitle></CardHeader>
                        <CardContent className="pl-0 sm:pl-2">
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                <BarChart accessibilityLayer data={selectedPlan.desempenhoSimulado || []} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="data" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${value / 1000}k` : value} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="alcance" fill="var(--color-alcance)" radius={8} className="fill-primary" />
                                    <Bar dataKey="engajamento" fill="var(--color-engajamento)" radius={8} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )}
    </>
  );
}
