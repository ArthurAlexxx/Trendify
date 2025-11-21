
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ConteudoAgendado } from '@/lib/types';
import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Tag, Calendar as CalendarIcon, MoreHorizontal, Trash2, CheckCircle } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  contentType: z.enum(['Reels', 'Story', 'Post']),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm).'),
  status: z.enum(['Agendado', 'Publicado', 'Rascunho']),
  notes: z.string().optional(),
});

export default function ContentCalendarPage() {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      contentType: 'Reels',
      date: new Date(),
      time: format(new Date(), 'HH:mm'),
      status: 'Agendado',
      notes: '',
    },
  });

  const scheduledContentQuery = useMemoFirebase(
    () =>
      firestore && user
        ? collection(firestore, `users/${user.uid}/conteudoAgendado`)
        : null,
    [firestore, user]
  );
  const { data: scheduledContent, isLoading } = useCollection<ConteudoAgendado>(scheduledContentQuery);

  const postsForSelectedDay = useMemo(() => {
    if (!scheduledContent) return [];
    return scheduledContent
      .filter((post) => isSameDay(post.date.toDate(), selectedDay))
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
  }, [scheduledContent, selectedDay]);

  const scheduledDays = useMemo(() => {
    if (!scheduledContent) return [];
    return scheduledContent.map(item => item.date.toDate());
  }, [scheduledContent]);
  
  const handleNewEventForDay = (day: Date) => {
    form.reset({
      ...form.getValues(),
      date: day,
      time: format(new Date(), 'HH:mm'),
      title: '',
      notes: '',
    });
    setIsModalOpen(true);
  };
  
  const handleSelectDay = (day: Date | undefined) => {
      if (day) {
        setSelectedDay(day);
      }
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;

    try {
      const [hours, minutes] = values.time.split(':').map(Number);
      const combinedDateTime = setMinutes(setHours(values.date, hours), minutes);

      await addDoc(collection(firestore, `users/${user.uid}/conteudoAgendado`), {
        title: values.title,
        contentType: values.contentType,
        date: combinedDateTime,
        status: values.status,
        notes: values.notes,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Sucesso!", description: "Seu post foi agendado." });
      form.reset();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({ title: "Erro", description: "Não foi possível agendar o post.", variant: 'destructive'});
    }
  }

   const handleMarkAsCompleted = async (postId: string) => {
    if (!user || !firestore) return;
    try {
        const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, postId);
        await updateDoc(postRef, { status: 'Publicado' });
        toast({ title: 'Sucesso!', description: 'Post marcado como publicado.' });
    } catch (error) {
        console.error('Error updating document:', error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o post.', variant: 'destructive' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || !firestore) return;
    try {
        const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, postId);
        await deleteDoc(postRef);
        toast({ title: 'Excluído!', description: 'O agendamento foi removido.' });
    } catch (error) {
        console.error('Error deleting document:', error);
        toast({ title: 'Erro', description: 'Não foi possível excluir o post.', variant: 'destructive' });
    }
  };
  
  const getBadgeVariant = (status: 'Agendado' | 'Publicado' | 'Rascunho') => {
    switch(status) {
      case 'Agendado': return 'default';
      case 'Publicado': return 'secondary';
      case 'Rascunho': return 'outline';
      default: return 'default';
    }
  }


  return (
    <div className="space-y-12">
      <PageHeader
        icon={<CalendarIcon />}
        title="Seu Calendário de Conteúdo Inteligente"
        description="Planeje, agende e visualize suas publicações em um só lugar."
      >
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="font-manrope rounded-full text-base w-full sm:w-auto" onClick={() => handleNewEventForDay(selectedDay)}>
              <Plus className="mr-2 h-5 w-5" />
              Agendar Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Novo Agendamento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 text-left">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Lançamento da nova coleção" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Reels">Reels</SelectItem>
                            <SelectItem value="Story">Story</SelectItem>
                            <SelectItem value="Post">Post</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Agendado">Agendado</SelectItem>
                            <SelectItem value="Publicado">Publicado</SelectItem>
                            <SelectItem value="Rascunho">Rascunho</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                  <span>Escolha uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(day) => day && field.onChange(day)}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anotações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ideias, hashtags, links..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">Agendar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 flex justify-center">
          <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card inline-block">
             <CardContent className="p-0 flex justify-center">
               <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={handleSelectDay}
                className="w-full"
                modifiers={{ scheduled: scheduledDays }}
                modifiersClassNames={{
                    scheduled: 'day-scheduled',
                    selected: 'day-selected',
                }}
              />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
           <Card className="rounded-2xl shadow-lg shadow-primary/5 border-border/20 bg-card">
             <CardHeader className="text-center sm:text-left">
                <CardTitle className="font-headline text-xl">
                  Posts para {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
             </CardHeader>
             <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : postsForSelectedDay.length > 0 ? (
                <div className="space-y-4 text-left">
                  {postsForSelectedDay.map(post => (
                    <div key={post.id} className="p-4 rounded-lg border bg-background/50 flex items-start justify-between gap-4">
                       <div className="flex items-start gap-4">
                         <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <Tag className="h-6 w-6 text-muted-foreground" />
                         </div>
                         <div>
                            <p className="font-semibold text-foreground">{post.title}</p>
                            <p className="text-sm text-muted-foreground">{post.contentType} • {format(post.date.toDate(), "HH:mm")}</p>
                         </div>
                       </div>
                       <div className='flex items-center gap-2'>
                        <Badge variant={getBadgeVariant(post.status)}>{post.status}</Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Abrir menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMarkAsCompleted(post.id)} disabled={post.status === 'Publicado'}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>Marcar como Publicado</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Excluir</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento do post.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                                Sim, excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 rounded-xl bg-muted/50 border border-dashed">
                  <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground">
                    Nenhum post para este dia.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Clique em um dia no calendário para agendar um post.
                  </p>
                </div>
              )}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

    