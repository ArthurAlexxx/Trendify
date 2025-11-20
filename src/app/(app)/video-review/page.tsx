'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Clapperboard, Captions, Lightbulb, List, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getVideoReviewAction } from './actions';

const formSchema = z.object({
  videoLink: z.string().url('Please enter a valid video URL.'),
});

export default function VideoReviewPage() {
  const { toast } = useToast();
  const [state, formAction] = useFormState(getVideoReviewAction, null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoLink: '',
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Error',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const result = state?.data;
  const isPending = form.formState.isSubmitting;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="AI Video Review"
        description="Get an AI-driven score and improvement suggestions for your video."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>Submit your video for review</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-4">
              <FormField
                control={form.control}
                name="videoLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.tiktok.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="font-manrope">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  'Review Video'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isPending || result) && (
        <Card>
          <CardHeader>
            <CardTitle>AI Review Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             {isPending && !result ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : result ? (
              <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="relative h-20 w-20">
                            <svg className="h-full w-full" viewBox="0 0 36 36">
                                <path className="text-border" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                <path className="text-primary" strokeDasharray={`${result.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-bold">{result.score}</span>
                            </div>
                        </div>
                        <p className="text-muted-foreground flex-1">This score reflects potential for engagement based on current trends and best practices.</p>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <InfoList title="Hook Suggestions" icon={Lightbulb} items={result.hookSuggestions} />
                  <InfoList title="Script Variations" icon={List} items={result.scriptVariations} />
                </div>
                <InfoCard title="Pacing Suggestions" icon={Clapperboard} content={result.pacingSuggestions} isTextarea />
                <InfoCard title="Optimized Caption" icon={Captions} content={result.caption} isTextarea />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ title, icon: Icon, content, isTextarea = false }: { title: string; icon: React.ElementType; content: string; isTextarea?: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" />{title}</h3>
      <Textarea readOnly value={content} className="h-32 bg-background" />
    </div>
  )
}

function InfoList({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: string[] }) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" />{title}</h3>
            <div className="p-3 rounded-md border bg-background space-y-2">
                {items.map((item, index) => (
                    <p key={index} className="text-sm border-b border-border/50 pb-2 last:border-b-0 last:pb-0">{item}</p>
                ))}
            </div>
        </div>
    )
}
