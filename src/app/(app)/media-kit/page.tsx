
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
  Bot,
  Sparkles,
  Loader2,
  Save,
  DollarSign,
  Target,
  FileText,
  Lightbulb,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useActionState, useTransition, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getAiCareerPackageAction,
  AiCareerPackageOutput,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const creatorProfileImage = PlaceHolderImages.find(
  (p) => p.id === 'creator-profile'
);
const caseStudyImage1 = PlaceHolderImages.find(
  (p) => p.id === 'case-study-1'
);
const caseStudyImage2 = PlaceHolderImages.find(
  (p) => p.id === 'case-study-2'
);

const formSchema = z.object({
  niche: z.string().min(10, 'Seu nicho deve ter pelo menos 10 caracteres.'),
  keyMetrics: z.string().min(10, 'Suas métricas devem ter pelo menos 10 caracteres.'),
  targetBrand: z.string().min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

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

  const { toast } = useToast();
  const [state, formAction, isGenerating] = useActionState(
    getAiCareerPackageAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: 'Criadora de conteúdo de lifestyle, moda e beleza sustentável.',
      keyMetrics: '250 mil seguidores no Instagram, 1.2M de alcance mensal, 4.7% de taxa de engajamento.',
      targetBrand: 'Sallve',
    },
  });
  
  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Erro',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const handleSave = (data: AiCareerPackageOutput) => {
    if (!user || !firestore) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para salvar.',
        variant: 'destructive',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const title = `Pacote de Prospecção para ${form.getValues('targetBrand')}`;
        
        let content = `**Apresentação:**\n${data.executiveSummary}\n\n`;
        content += `**Tabela de Preços:**\n`;
        content += `- Reels: ${data.pricingTiers.reels}\n`;
        content += `- Stories: ${data.pricingTiers.storySequence}\n`;
        content += `- Post: ${data.pricingTiers.staticPost}\n`;
        content += `- Pacote: ${data.pricingTiers.monthlyPackage}\n\n`;
        content += `**Ideias de Colaboração:**\n${data.sampleCollaborationIdeas.map(idea => `- ${idea}`).join('\n')}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Mídia Kit & Prospecção',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Sucesso!',
          description: 'Seu pacote de prospecção foi salvo no painel.',
        });
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar o pacote. Tente novamente.',
          variant: 'destructive',
        });
      }
    });
  };

  const result = state?.data;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Propostas & Mídia Kit"
        description="Gere propostas, calcule preços e seu mídia kit profissional em um só lugar."
      >
        <SavedIdeasSheet />
      </PageHeader>
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          
          {/* AI Proposal Generator */}
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-xl">
                <Bot className="h-6 w-6 text-primary" />
                <span>Assistente de Carreira</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  action={formAction}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                     <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seu Nicho de Atuação</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 'Lifestyle, moda e beleza sustentável'"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                       <FormField
                        control={form.control}
                        name="keyMetrics"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suas Métricas Chave</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: '250K seguidores, 4.7% engajamento...'"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="targetBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marca Alvo (para contexto)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 'Sallve', 'Natura', 'Nike'"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isGenerating}
                      size="lg"
                      className="font-manrope sm:w-auto h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                    >
                      {isGenerating ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
                      ) : (
                        <><Sparkles className="mr-2 h-5 w-5" />Gerar Pacote de Prospecção</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* AI Result */}
          {(isGenerating || result) && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className='flex-1'>
                  <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Resultado da IA</h2>
                  <p className="text-muted-foreground">Um pacote completo para sua prospecção de marcas.</p>
                </div>
                {result && (
                  <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Pacote
                  </Button>
                )}
              </div>

              {isGenerating && !result ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">A IA está criando seu pacote de prospecção...</p>
                </div>
              ) : result ? (
                 <div className="grid gap-8">
                  <InfoCard title="Apresentação para Marcas" icon={FileText} content={result.executiveSummary} isTextarea />
                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <PricingCard title="Tabela de Preços Sugerida" icon={DollarSign} pricing={result.pricingTiers} />
                    <InfoList title="Ideias de Colaboração" icon={Lightbulb} items={result.sampleCollaborationIdeas} />
                  </div>
                </div>
              ) : null}
            </div>
          )}

           <Separator className="my-12" />

          {/* Media Kit Editor */}
          <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Informações do Mídia Kit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[120px] rounded-xl" />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="followers">Total de Seguidores</Label>
                  <Input id="followers" value={followers} onChange={(e) => setFollowers(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engagement">Taxa de Engajamento</Label>
                  <Input id="engagement" value={engagement} onChange={(e) => setEngagement(e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Demografia do Público</Label>
                <Textarea id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="min-h-[100px] rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
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

function InfoCard({
  title,
  icon: Icon,
  content,
  isTextarea = false,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  isTextarea?: boolean;
}) {
  return (
    <Card
      className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         {isTextarea ? (
          <Textarea
            readOnly
            value={content}
            className="h-40 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
          />
        ) : (
          <p className="p-4 rounded-xl border border-border/10 bg-background/50 text-base text-foreground">
            {content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}


function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-sm p-3 rounded-xl bg-background/50 border border-border/20"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function PricingCard({
  title,
  icon: Icon,
  pricing,
}: {
  title: string;
  icon: React.ElementType;
  pricing: AiCareerPackageOutput['pricingTiers'];
}) {
  return (
    <Card
      className="shadow-lg shadow-primary/5 border-border/20 bg-card/60 backdrop-blur-lg rounded-2xl h-full"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <Icon className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-xs text-muted-foreground mb-4'>Valores baseados nas suas métricas. Use como ponto de partida para negociações.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Formato</TableHead>
              <TableHead className="text-right">Faixa de Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Reels</TableCell>
              <TableCell className="text-right font-mono">{pricing.reels}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">Sequência de Stories</TableCell>
              <TableCell className="text-right font-mono">{pricing.storySequence}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">Post Estático (Feed)</TableCell>
              <TableCell className="text-right font-mono">{pricing.staticPost}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium text-primary">Pacote Mensal</TableCell>
              <TableCell className="text-right font-mono text-primary font-bold">{pricing.monthlyPackage}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
