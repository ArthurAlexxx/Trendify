'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Download,
  Link as LinkIcon,
  Instagram,
  Youtube,
  User,
  BarChart2,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';

const creatorProfileImage = PlaceHolderImages.find(
  (p) => p.id === 'creator-profile'
);
const caseStudyImage1 = PlaceHolderImages.find(
  (p) => p.id === 'case-study-1'
);
const caseStudyImage2 = PlaceHolderImages.find(
  (p) => p.id === 'case-study-2'
);

export default function MediaKitPage() {
  const [name, setName] = useState('Jessica Day');
  const [bio, setBio] = useState(
    'Criadora de conteúdo de lifestyle e moda de LA. Apaixonada por marcas sustentáveis e narrativas autênticas. Vamos criar algo lindo juntos!'
  );
  const [followers, setFollowers] = useState('250K');
  const [engagement, setEngagement] = useState('4.7%');
  const [audience, setAudience] = useState(
    'Idade 18-24, 75% Mulheres, Principais locais: EUA, Reino Unido, Canadá'
  );

  return (
    <div className="grid lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-12">
        <PageHeader
          title="Kit de Mídia Automatizado"
          description="Preencha seus dados para gerar um kit de mídia profissional em tempo real."
        />
        <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Informações do Criador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-[120px] rounded-xl"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="followers">Total de Seguidores</Label>
                <Input
                  id="followers"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engagement">Taxa de Engajamento</Label>
                <Input
                  id="engagement"
                  value={engagement}
                  onChange={(e) => setEngagement(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Demografia do Público</Label>
              <Textarea
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="min-h-[100px] rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-headline font-bold">Prévia ao Vivo</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full">
                <LinkIcon className="h-4 w-4 mr-2" />
                Obter Link
              </Button>
              <Button className="font-manrope rounded-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
          <Card className="overflow-hidden shadow-2xl rounded-2xl">
            <div className="bg-primary/10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative h-24 w-24 shrink-0 rounded-full overflow-hidden ring-4 ring-background">
                  <Image
                    src={creatorProfileImage?.imageUrl ?? ''}
                    alt="Criador"
                    fill
                    style={{ objectFit: 'cover' }}
                    data-ai-hint={creatorProfileImage?.imageHint}
                  />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-headline font-black text-center sm:text-left">
                    {name}
                  </h1>
                  <div className="flex gap-4 mt-2 justify-center sm:justify-start text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Instagram className="h-4 w-4" />
                      @jessday
                    </span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <Youtube className="h-4 w-4" />
                      JessicaDayVlogs
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 grid gap-8 bg-card">
              <div>
                <h3 className="font-headline font-bold text-lg mb-2">
                  Sobre Mim
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{bio}</p>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" /> Métricas Principais
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong className='text-foreground'>Seguidores:</strong> {followers}
                    </p>
                    <p>
                      <strong className='text-foreground'>Engajamento:</strong> {engagement}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Público
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{audience}</p>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-headline font-bold text-lg mb-4">
                  Estudos de Caso de Sucesso
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CaseStudyCard
                    image={caseStudyImage1?.imageUrl ?? ''}
                    hint={caseStudyImage1?.imageHint ?? ''}
                    title="Aura Cosmetics"
                    results="1.5M+ Views, 20% ↑ Vendas"
                  />
                  <CaseStudyCard
                    image={caseStudyImage2?.imageUrl ?? ''}
                    hint={caseStudyImage2?.imageHint ?? ''}
                    title="Chic Threads"
                    results="3M+ Alcance, Esgotado"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CaseStudyCard({
  image,
  hint,
  title,
  results,
}: {
  image: string;
  hint: string;
  title: string;
  results: string;
}) {
  return (
    <div className="border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
      <div className="relative h-32 w-full">
        <Image
          src={image}
          alt={title}
          fill
          style={{ objectFit: 'cover' }}
          data-ai-hint={hint}
        />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-sm font-headline">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{results}</p>
      </div>
    </div>
  );
}
