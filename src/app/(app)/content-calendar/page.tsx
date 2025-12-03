
'use client';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { ConteudoAgendado } from '@/lib/types';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  Plus,
  Tag,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Edit,
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FullScreenCalendar } from '@/components/ui/fullscreen-calendar';
import { Calendar } from '@/components/ui/calendar';

const formSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  contentType: z.enum(['Reels', 'Story', 'Post']),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm).'),
  status: z.enum(['Agendado', 'Publicado', 'Rascunho']),
  notes: z.string().optional(),
});

export default function ContentCalendarPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ConteudoAgendado | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
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
  
  // Effect to reset form when modal closes or editing post changes
  useEffect(() => {
    if (isModalOpen && editingPost) {
        form.reset({
            title: editingPost.title,
            contentType: editingPost.contentType,
            date: editingPost.date.toDate(),
            time: format(editingPost.date.toDate(), 'HH:mm'),
            status: editingPost.status,
            notes: editingPost.notes || '',
        });
    } else if (isModalOpen) { // For new posts, ensure date is set but other fields are cleared
        const currentDate = form.getValues('date'); // Keep the date set by handleNewEventForDay
        form.reset({
            title: '',
            contentType: 'Reels',
            date: currentDate, // Preserve the selected day
            time: format(new Date(), 'HH:mm'),
            status: 'Agendado',
            notes: '',
        });
    } else { // When modal is closed, fully reset
         form.reset({
            title: '',
            contentType: 'Reels',
            date: new Date(),
            time: format(new Date(), 'HH:mm'),
            status: 'Agendado',
            notes: '',
        });
    }
  }, [isModalOpen, editingPost, form]);


  const scheduledContentQuery = useMemoFirebase(
    () =>
      firestore && user
        ? collection(firestore, `users/${user.uid}/conteudoAgendado`)
        : null,
    [firestore, user]
  );
  const { data: scheduledContent, isLoading } =
    useCollection<ConteudoAgendado>(scheduledContentQuery);

  const handleNewEventForDay = (day: Date) => {
    setEditingPost(null);
    form.setValue('date', day); // Set the date for the new event
    setIsModalOpen(true);
  };
  
  const handleEditEvent = (event: ConteudoAgendado) => {
    setEditingPost(event);
    setIsModalOpen(true);
  };


  const calendarData = useMemo(() => {
    if (!scheduledContent) return [];
    
    // Group events by day
    const groupedByDay = scheduledContent.reduce((acc, item) => {
      const dayStr = format(item.date.toDate(), 'yyyy-MM-dd');
      if (!acc[dayStr]) {
        acc[dayStr] = {
          day: item.date.toDate(),
          events: [],
        };
      }
      acc[dayStr].events.push({
        id: item.id,
        title: item.title,
        date: item.date,
        contentType: item.contentType,
        status: item.status,
        notes: item.notes,
        // For FullScreenCalendar component
        name: item.title,
        time: format(item.date.toDate(), 'HH:mm'),
        datetime: item.date.toDate().toISOString(),
      });
      return acc;
    }, {} as Record<string, { day: Date; events: any[] }>);

    return Object.values(groupedByDay);
  }, [scheduledContent]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;

    try {
      const [hours, minutes] = values.time.split(':').map(Number);
      const combinedDateTime = setMinutes(setHours(values.date, hours), minutes);
      
      const payload = {
        title: values.title,
        contentType: values.contentType,
        date: combinedDateTime,
        status: values.status,
        notes: values.notes,
        userId: user.uid,
      }

      if (editingPost) {
        // Update existing document
        const postRef = doc(firestore, `users/${user.uid}/conteudoAgendado`, editingPost.id);
        await updateDoc(postRef, payload);
        toast({ title: 'Sucesso!', description: 'Seu agendamento foi atualizado.' });

      } else {
        // Create new document
        await addDoc(
          collection(firestore, `users/${user.uid}/conteudoAgendado`),
          { ...payload, createdAt: serverTimestamp() }
        );
        toast({ title: 'Sucesso!', description: 'Seu post foi agendado.' });
      }
      
      setEditingPost(null);
      setIsModalOpen(false);
      form.reset();

    } catch (error) {
      console.error('Error saving document: ', error);
      toast({
        title: 'Erro',
        description: `Não foi possível salvar o agendamento.`,
        variant: 'destructive',
      });
    }
  }

  const handleMarkAsCompleted = async (postId: string) => {
    if (!user || !firestore) return;
    try {
      const postRef = doc(
        firestore,
        `users/${user.uid}/conteudoAgendado`,
        postId
      );
      await updateDoc(postRef, { status: 'Publicado' });
      toast({ title: 'Sucesso!', description: 'Post marcado como publicado.' });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o post.',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (postId: string) => {
    setPostToDelete(postId);
    setIsDeleteSheetOpen(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete || !user || !firestore) return;
    try {
      const postRef = doc(
        firestore,
        `users/${user.uid}/conteudoAgendado`,
        postToDelete
      );
      await deleteDoc(postRef);
      toast({ title: 'Excluído!', description: 'O agendamento foi removido.' });
      setIsDeleteSheetOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o post.',
        variant: 'destructive',
      });
    }
  };

  const getBadgeVariant = (status: 'Agendado' | 'Publicado' | 'Rascunho') => {
    switch (status) {
      case 'Agendado':
        return 'default';
      case 'Publicado':
        return 'secondary';
      case 'Rascunho':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const findFullEventById = (id: string): ConteudoAgendado | undefined => {
     return scheduledContent?.find(event => event.id === id);
  }

  if (isLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-[70vh] w-full" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendário de Conteúdo"
        description="Visualize e organize suas publicações."
      />

      <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="font-headline text-xl">
              {editingPost ? "Editar Agendamento" : "Novo Agendamento"}
            </SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pt-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Lançamento da nova coleção"
                        {...field}
                      />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
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
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
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
                            disabled={(date) => date < new Date('1900-01-01')}
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
                      <Textarea
                        placeholder="Ideias, hashtags, links..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-4 flex-col sm:flex-row gap-2">
                <SheetClose asChild>
                    <Button type="button" variant="outline" className='w-full sm:w-auto'>Cancelar</Button>
                </SheetClose>
                <Button type="submit" className="w-full sm:w-auto">
                   {editingPost ? "Salvar Alterações" : "Agendar Post"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      
      <Sheet open={isDeleteSheetOpen} onOpenChange={setIsDeleteSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Você tem certeza?</SheetTitle>
            <SheetDescription>
              Esta ação não pode ser desfeita e irá excluir permanentemente o agendamento.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
            <SheetClose asChild>
              <Button variant="outline">Cancelar</Button>
            </SheetClose>
            <Button onClick={handleDeletePost} variant="destructive">
              Sim, excluir
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FullScreenCalendar
        data={calendarData}
        onNewEvent={handleNewEventForDay}
        renderEventActions={(event) => {
            const fullEvent = findFullEventById(event.id as string);
            if (!fullEvent) return null;
            
            return (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleMarkAsCompleted(event.id as string)} disabled={event.status === 'Publicado'}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>Marcar como Publicado</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleEditEvent(fullEvent)}}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); confirmDelete(event.id as string); }}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Excluir</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}}
        renderEventBadge={(event) => (
             <Badge variant={getBadgeVariant(event.status)}>{event.status}</Badge>
        )}
      />
    </div>
  );
}
