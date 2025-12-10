
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PlanoSemanal, ItemRoteiro } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


interface DailyPlanCardProps {
  isLoadingWeeklyPlans: boolean;
  currentPlan: PlanoSemanal | undefined;
  handleToggleRoteiro: (itemIndex: number) => void;
}

export default function DailyPlanCard({ isLoadingWeeklyPlans, currentPlan, handleToggleRoteiro }: DailyPlanCardProps) {
  const daysOfWeekMap: { [key: string]: number } = {
    Domingo: 0,
    Segunda: 1,
    Terça: 2,
    Quarta: 3,
    Quinta: 4,
    Sexta: 5,
    Sábado: 6,
  };
  const todayIndex = new Date().getDay();
  const tasksForToday = currentPlan?.items.filter(item => {
    const itemDay = item.dia.replace('-feira', '');
    return daysOfWeekMap[itemDay as keyof typeof daysOfWeekMap] === todayIndex;
  });

  return (
    <Card className="h-full shadow-primary-lg">
      <CardHeader>
        <CardTitle className="text-center font-headline text-lg flex items-center justify-center gap-2">
          Plano para Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingWeeklyPlans ? (
          <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : tasksForToday && tasksForToday.length > 0 ? (
          <ul className="space-y-3">
            {tasksForToday.map((item: any, index: number) => {
              const originalIndex = currentPlan!.items.findIndex((pItem: any) => pItem.dia === item.dia && pItem.tarefa === item.tarefa);
              return (
                <li key={index} className="flex items-start gap-3">
                  <Checkbox
                    id={`daily-plan-task-${index}`}
                    checked={item.concluido}
                    onCheckedChange={() => handleToggleRoteiro(originalIndex)}
                    className="h-5 w-5 mt-0.5 shrink-0"
                  />
                  <div className="grid gap-0.5">
                    <label
                      htmlFor={`daily-plan-task-${index}`}
                      className={cn(
                        'font-medium transition-colors cursor-pointer text-sm',
                        item.concluido ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {item.tarefa}
                    </label>
                    <p className="text-xs text-muted-foreground">{item.detalhes}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">Nenhuma tarefa para hoje.</p>
            <Button variant="link" size="sm">
              <Link href="/generate-weekly-plan">Ver plano completo</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
