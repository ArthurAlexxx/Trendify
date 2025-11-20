
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
  Clapperboard,
  FileText,
  Save,
  Eye,
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
  getAiSuggestedVideoScriptsAction,
  AiSuggestedVideoScriptsOutput,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SavedIdeasSheet } from '@/components/saved-ideas-sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  productDescription: z
    .string()
    .min(10, 'A descrição do produto deve ter pelo menos 10 caracteres.'),
  brandDetails: z
    .string()
    .min(10, 'Os detalhes da marca devem ter pelo menos 10 caracteres.'),
  trendingTopic: z.string().optional(),
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
    getAiSuggestedVideoScriptsAction,
    null
  );
  const [isSaving, startSavingTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productDescription: '',
      brandDetails: '',
      trendingTopic: '',
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

  const handleSave = (data: AiSuggestedVideoScriptsOutput) => {
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
        const title = `Proposta: ${form
          .getValues('brandDetails')
          .substring(0, 30)}...`;
        const content = `**Roteiro:**\n${data.videoScript}\n\n**Proposta:**\n${data.proposalDraft}`;

        await addDoc(collection(firestore, `users/${user.uid}/ideiasSalvas`), {
          userId: user.uid,
          titulo: title,
          conteudo: content,
          origem: 'Propostas & Mídia Kit',
          concluido: false,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Sucesso!',
          description: 'Sua proposta foi salva no painel.',
        });
      } catch (error) {
        console.error('Failed to save idea:', error);
        toast({
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar a ideia. Tente novamente.',
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
        description="Gere propostas com IA e seu mídia kit profissional em um só lugar."
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
                <span>Gerador de Propostas com IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(() => {
                    const formData = new FormData();
                    const values = form.getValues();
                    formData.append('productDescription', values.productDescription);
                    formData.append('brandDetails', values.brandDetails);
                    formData.append('trendingTopic', values.trendingTopic || '');
                    formAction(formData);
                  })}
                  className="space-y-8"
                >
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
                    <FormField
                      control={form.control}
                      name="brandDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Para qual marca é a proposta?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: 'Marca de moda sustentável, focada no público jovem...'"
                              className="min-h-[140px] rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="productDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qual produto será divulgado?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: 'Um novo tênis de corrida feito com materiais reciclados, super leve...'"
                              className="min-h-[140px] rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                        <><Sparkles className="mr-2 h-5 w-5" />Gerar Proposta</>
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
                  <p className="text-muted-foreground">Conteúdo gerado para sua próxima colaboração de sucesso.</p>
                </div>
                {result && (
                  <Button onClick={() => handleSave(result)} disabled={isSaving} className="w-full sm:w-auto rounded-full font-manrope">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Proposta
                  </Button>
                )}
              </div>

              {isGenerating && !result ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-background h-96">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">A IA está preparando sua proposta...</p>
                </div>
              ) : result ? (
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                  <InfoCard title="Roteiro de Vídeo Gerado" icon={Clapperboard} content={result.videoScript} />
                  <InfoCard title="Rascunho da Proposta" icon={FileText} content={result.proposalDraft} />
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
}: {
  title: string;
  icon: React.ElementType;
  content: string;
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
        <Textarea
          readOnly
          value={content}
          className="h-96 bg-background/50 text-base leading-relaxed resize-none rounded-xl"
        />
      </CardContent>
    </Card>
  );
}

    