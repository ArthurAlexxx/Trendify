'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Clock, Copy } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Tendencia } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrendRadarPage() {
  const firestore = useFirestore();

  const tendenciasQuery = useMemoFirebase(
    () => firestore && collection(firestore, 'tendencia'),
    [firestore]
  );
  const { data: tendencias, isLoading } = useCollection<Tendencia>(tendenciasQuery);

  const [filteredTrends, setFilteredTrends] = useState<Tendencia[] | null>(null);
  const [niche, setNiche] = useState('Todos');
  const [country, setCountry] = useState('Todos');

  const allNiches = [
    'Todos',
    ...Array.from(new Set(tendencias?.map((t) => t.nicho) ?? [])),
  ];
  const allCountries = [
    'Todos',
    ...Array.from(new Set(tendencias?.map((t) => t.pais) ?? [])),
  ];

  useEffect(() => {
    if (!tendencias) return;
    let newTrends = tendencias;
    if (niche !== 'Todos') {
      newTrends = newTrends.filter((t) => t.nicho === niche);
    }
    if (country !== 'Todos') {
      newTrends = newTrends.filter((t) => t.pais === country);
    }
    setFilteredTrends(newTrends);
  }, [niche, country, tendencias]);

  const trendsToDisplay = filteredTrends ?? tendencias;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Radar de Tendências"
        description="Feed curado de sons e estilos em alta no Instagram e TikTok."
      />

      <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <CardTitle className="font-headline text-xl">Filtros</CardTitle>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-full">
                  <SelectValue placeholder="Filtrar por nicho" />
                </SelectTrigger>
                <SelectContent>
                  {allNiches.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-full">
                  <SelectValue placeholder="Filtrar por país" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex flex-col rounded-2xl overflow-hidden">
                <CardHeader className="p-0">
                  <Skeleton className="h-56 w-full" />
                </CardHeader>
                <CardContent className="flex-grow space-y-3 p-6">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
                <CardFooter className="p-6 flex justify-between items-center text-sm">
                   <Skeleton className="h-5 w-24" />
                   <Skeleton className="h-9 w-28 rounded-full" />
                </CardFooter>
              </Card>
            ))
        ): (
          trendsToDisplay?.map((trend) => (
          <Card key={trend.id} className="flex flex-col rounded-2xl overflow-hidden shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-primary/10">
            <CardHeader className="p-0">
              <div className="relative w-full h-56">
                <Image
                  src={trend.exampleImageUrl}
                  alt={trend.titulo}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={trend.exampleImageHint}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 p-6">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-headline">
                  {trend.titulo}
                </CardTitle>
                <Badge
                  variant={trend.tipo === 'Som' ? 'default' : 'secondary'}
                  className="rounded-full"
                >
                  {trend.tipo}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {trend.explicacao}
              </p>
            </CardContent>
            <CardFooter className="p-6 flex justify-between items-center text-sm bg-background/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-red-500" />
                <span>
                  Use em:{' '}
                  <span className="font-semibold text-red-500">
                    {trend.contagemRegressiva} dias
                  </span>
                </span>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar {trend.tipo === 'Som' ? 'Som' : 'Ideia'}
              </Button>
            </CardFooter>
          </Card>
        )))}
      </div>
    </div>
  );
}
