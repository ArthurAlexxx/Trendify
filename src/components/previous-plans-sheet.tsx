
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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

const chartConfig = {
  alcance: { label: 'Alcance', color: 'hsl(var(--primary))' },
  engajamento: { label: 'Engajamento', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;


export function PreviousPlansSheet() {
  const firestore = useFirestore();

  const previousPlansQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'roteiro'),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore]
  );
  const { data: previousPlans, isLoading } =
    useCollection<PlanoSemanal>(previousPlansQuery);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="font-manrope rounded-full">
          <History className="mr-2 h-4 w-4" />
          Planos Anteriores
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-headline text-xl">Planos Anteriores</SheetTitle>
          <SheetDescription>
            Acesse aqui todos os planejamentos que você já gerou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          <div className="space-y-4">
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className='h-8'>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="font-headline text-2xl">
                                Detalhes do Plano - {format(plan.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="py-4 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                               <Card>
                                 <CardHeader><CardTitle>Roteiro de Conteúdo</CardTitle></CardHeader>
                                 <CardContent>
                                    <ul className="space-y-2">
                                    {plan.items.map((item, index) => (
                                        <li key={index}>
                                        <div className="p-2 rounded-lg">
                                            <div>
                                            <p className={'font-medium text-base text-foreground'}>
                                                <span className="font-semibold text-primary">{item.dia}:</span> {item.tarefa}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{item.detalhes}</p>
                                            </div>
                                        </div>
                                        {index < plan.items.length - 1 && <Separator className="my-2" />}
                                        </li>
                                    ))}
                                    </ul>
                                 </CardContent>
                               </Card>
                               <Card>
                                 <CardHeader><CardTitle>Simulação de Desempenho</CardTitle></CardHeader>
                                 <CardContent className="pl-2">
                                     <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                        <BarChart accessibilityLayer data={plan.desempenhoSimulado || []} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                          </DialogContent>
                        </Dialog>
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
  );
}
