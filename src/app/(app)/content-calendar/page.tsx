
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
  setHours,
  setMinutes,
} from 'firebase/firestore';
import {
  Plus,
  Tag,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Edit,
  Clock,
  Info,
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FullScreenCalendar } from '@/components/ui/fullscreen-calendar';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  const [editingPost, setEditingPost] = useState<ConteudoAgendado | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConteudoAgendado | null>(null);

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
    if (!isModalOpen) {
        // Reset form completely when modal is closed
        setEditingPost(null);
        form.reset({
            title: '',
            contentType: 'Reels',
            date: new Date(),
            time: format(new Date(), 'HH:mm'),
            status: 'Agendado',
            notes: '',
        });
    } else if (editingPost) {
        // If editing, set form values from the post
        form.reset({
            title: editingPost.title,
            contentType: editingPost.contentType,
            date: editingPost.date.toDate(),
            time: format(editingPost.date.toDate(), 'HH:mm'),
            status: editingPost.status,
            notes: editingPost.notes || '',
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
    form.reset({
        title: '',
        contentType: 'Reels',
        date: day, // Use the selected day from the calendar
        time: format(new Date(), 'HH:mm'),
        status: 'Agendado',
        notes: '',
    });
    setIsModalOpen(true);
  };
  
  const handleEditEvent = (event: ConteudoAgendado) => {
    setEditingPost(event);
    setIsModalOpen(true);
    setIsDetailSheetOpen(false); // Close detail view if editing
  };
  
  const handleEventClick = (event: ConteudoAgendado) => {
    setSelectedEvent(event);
    setIsDetailSheetOpen(true);
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
      
      setIsModalOpen(false);

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
      setIsDetailSheetOpen(false);
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
    setIsDetailSheetOpen(false);
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
        icon={CalendarIcon}
      />

      {/* Sheet for Creating/Editing */}
      <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
        <SheetContent className="p-0 flex flex-col sm:max-w-lg">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="font-headline text-xl">
              {editingPost ? "Editar Agendamento" : "Novo Agendamento"}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
             <div className="p-6">
                <Form {...form}>
                    <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
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
                    </form>
                </Form>
             </div>
          </ScrollArea>
           <SheetFooter className="p-6 border-t flex-col sm:flex-row gap-2">
                <SheetClose asChild>
                    <Button type="button" variant="outline" className='w-full sm:w-auto'>Cancelar</Button>
                </SheetClose>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} className="w-full sm:w-auto">
                   {editingPost ? "Salvar Alterações" : "Agendar Post"}
                </Button>
            </SheetFooter>
        </SheetContent>
      </Sheet>

       {/* Sheet for viewing details */}
      {selectedEvent && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent className="p-0 flex flex-col sm:max-w-lg">
            <SheetHeader className="p-6 pb-4 border-b space-y-3">
              <Badge variant={getBadgeVariant(selectedEvent.status)} className='w-fit'>{selectedEvent.status}</Badge>
              <SheetTitle className="font-headline text-2xl">{selectedEvent.title}</SheetTitle>
              <SheetDescription className="!mt-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground">
                    <div className='flex items-center gap-1.5'>
                        <Tag className="h-3 w-3" />
                        <span>{selectedEvent.contentType}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <Clock className="h-3 w-3" />
                        <span>{format(selectedEvent.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                </div>
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
                 {selectedEvent.notes && (
                    <div className="p-6">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary"/>
                          Anotações
                        </h4>
                        <div className="p-4 rounded-lg bg-muted/50 border">
                           <p className="whitespace-pre-wrap text-muted-foreground text-sm">{selectedEvent.notes}</p>
                        </div>
                    </div>
                 )}
            </ScrollArea>
             <SheetFooter className="p-6 border-t flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <div className='flex flex-col sm:flex-row gap-2'>
                    <Button variant="outline" onClick={() => handleEditEvent(selectedEvent)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                    <Button variant="outline" disabled={selectedEvent.status === 'Publicado'} onClick={() => handleMarkAsCompleted(selectedEvent.id)}><CheckCircle className="mr-2 h-4 w-4" /> Publicado</Button>
                </div>
                <Button variant="destructive" onClick={() => confirmDelete(selectedEvent.id)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      
      {/* Sheet for Deleting */}
      <Sheet open={isDeleteSheetOpen} onOpenChange={setIsDeleteSheetOpen}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl">
          <SheetHeader className="p-6 pb-4 text-center">
            <SheetTitle>Você tem certeza?</SheetTitle>
            <SheetDescription>
              Esta ação não pode ser desfeita e irá excluir permanentemente o agendamento.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="p-6 pt-4 bg-muted/50 flex-col-reverse sm:flex-row gap-2">
            <SheetClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
            </SheetClose>
            <Button onClick={handleDeletePost} variant="destructive" className="w-full sm:w-auto">
              Sim, excluir
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FullScreenCalendar
        data={calendarData}
        onNewEvent={handleNewEventForDay}
        onEventClick={(event) => {
            const fullEvent = findFullEventById(event.id as string);
            if(fullEvent) {
                handleEventClick(fullEvent);
            }
        }}
      />
    </div>
  );
}

    

    

    