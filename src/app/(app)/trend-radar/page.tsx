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

export default function TrendRadarPage() {
  const firestore = useFirestore();

  const tendenciasQuery = useMemoFirebase(
    () => firestore && collection(firestore, 'tendencia'),
    [firestore]
  );
  const { data: tendencias } = useCollection<Tendencia>(tendenciasQuery);

  const [filteredTrends, setFilteredTrends] = useState<Tendencia[] | null>(
    null
  );
  const [niche, setNiche] = useState('Todos');
  const [country, setCountry] = useState('Todos');

  useEffect(() => {
    if (tendencias) {
      setFilteredTrends(tendencias);
    }
  }, [tendencias]);

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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Radar de Tendências"
        description="Feed curado de sons e estilos em alta no Instagram e TikTok."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <CardTitle>Filtros</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                <SelectTrigger className="w-full sm:w-[180px]">
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(filteredTrends ?? tendencias)?.map((trend) => (
          <Card key={trend.id} className="flex flex-col">
            <CardHeader>
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image
                  src={trend.exampleImageUrl}
                  alt={trend.titulo}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={trend.exampleImageHint}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-headline">
                  {trend.titulo}
                </CardTitle>
                <Badge
                  variant={trend.tipo === 'Som' ? 'default' : 'secondary'}
                >
                  {trend.tipo}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {trend.explicacao}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-red-500" />
                <span>
                  Use em:{' '}
                  <span className="font-semibold text-red-500">
                    {trend.contagemRegressiva} dias
                  </span>
                </span>
              </div>
              <Button variant="ghost" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copiar {trend.tipo === 'Som' ? 'Som' : 'Ideia'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
