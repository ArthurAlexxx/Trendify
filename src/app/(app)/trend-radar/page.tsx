'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { trends } from '@/lib/data';
import { Trend } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Clock, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const allNiches = ['All', ...Array.from(new Set(trends.map(t => t.niche)))];
const allCountries = ['All', ...Array.from(new Set(trends.map(t => t.country)))];

export default function TrendRadarPage() {
    const [filteredTrends, setFilteredTrends] = useState<Trend[]>(trends);
    const [niche, setNiche] = useState('All');
    const [country, setCountry] = useState('All');

    const handleFilter = () => {
        let newTrends = trends;
        if (niche !== 'All') {
            newTrends = newTrends.filter(t => t.niche === niche);
        }
        if (country !== 'All') {
            newTrends = newTrends.filter(t => t.country === country);
        }
        setFilteredTrends(newTrends);
    }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trend Radar"
        description="Curated feed of trending sounds and styles from Instagram & TikTok."
      />

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <CardTitle>Filters</CardTitle>
            <div className="flex gap-2">
                <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by niche" />
                    </SelectTrigger>
                    <SelectContent>
                        {allNiches.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by country" />
                    </SelectTrigger>
                    <SelectContent>
                        {allCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={handleFilter} className="font-manrope">Apply</Button>
            </div>
            </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTrends.map(trend => (
          <Card key={trend.id} className="flex flex-col">
            <CardHeader>
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image 
                    src={trend.exampleImageUrl} 
                    alt={trend.title} 
                    fill 
                    style={{objectFit: 'cover'}}
                    data-ai-hint={trend.exampleImageHint}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-headline">{trend.title}</CardTitle>
                <Badge variant={trend.type === 'Sound' ? 'default' : 'secondary'}>{trend.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{trend.explainer}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-red-500" />
                    <span>Use by: <span className="font-semibold text-red-500">{trend.countdown} days</span></span>
                </div>
                <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy {trend.type === 'Sound' ? 'Sound' : 'Idea'}
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
