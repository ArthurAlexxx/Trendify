'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Circle,
  Plus,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase, useFirestore } from '@/firebase/provider';
import { collection } from 'firebase/firestore';

const chartConfig = {
  alcance: {
    label: 'Alcance',
  },
  engajamento: {
    label: 'Engajamento',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const firestore = useFirestore();

  const metricaQuery = useMemoFirebase(
    () => firestore && collection(firestore, 'metrica'),
    [firestore]
  );
  const { data: metrica } = useCollection(metricaQuery);

  const dadosGraficoQuery = useMemoFirebase(
    () => firestore && collection(firestore, 'dadosGrafico'),
    [firestore]
  );
  const { data: dadosGrafico } = useCollection(dadosGraficoQuery);

  const roteiroQuery = useMemoFirebase(
    () => firestore && collection(firestore, 'roteiro'),
    [firestore]
  );
  const { data: roteiro } = useCollection(roteiroQuery);

  return (
    <>
      <PageHeader
        title="Bem-vindo de volta, Criador!"
        description="Aqui está um resumo da sua semana e seu plano."
      >
        <Button className="font-manrope">
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrica?.map((metric) => (
            <Card key={metric.nome}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.nome}
                </CardTitle>
                {metric.tipoAlteracao === 'aumento' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.valor}</div>
                <p
                  className={cn(
                    'text-xs',
                    metric.tipoAlteracao === 'aumento'
                      ? 'text-green-500'
                      : 'text-red-500'
                  )}
                >
                  {metric.alteracao} da semana passada
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Desempenho Semanal</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full"
              >
                <BarChart accessibilityLayer data={dadosGrafico}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="data"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="alcance"
                    fill="var(--color-alcance)"
                    radius={4}
                    className="fill-primary"
                  />
                  <Bar
                    dataKey="engajamento"
                    fill="var(--color-engajamento)"
                    radius={4}
                    className="fill-accent"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Roteiro de Conteúdo Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {roteiro?.map((item, index) => (
                  <li key={item.tarefa}>
                    <div className="flex items-start gap-4">
                      {item.concluido ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 text-accent" />
                      ) : (
                        <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {item.dia}: {item.tarefa}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.detalhes}
                        </p>
                      </div>
                    </div>
                    {index < roteiro.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
