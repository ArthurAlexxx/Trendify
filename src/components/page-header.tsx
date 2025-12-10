
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  imageUrl?: string | null;
}

export function PageHeader({ title, description, children, imageUrl }: PageHeaderProps) {
  const hasImage = imageUrl;

  return (
    <div className="flex flex-col items-center gap-4 w-full mb-8">
        <div className="flex flex-col items-center gap-2 text-center">
            {hasImage && (
                <div className='relative group'>
                    <Avatar className="h-20 w-20 rounded-2xl border-2 border-primary/20 mb-2">
                        <AvatarImage src={imageUrl ?? undefined} />
                        <AvatarFallback>{title?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            )}
            <h1 className={cn(
                "text-3xl md:text-4xl font-bold font-headline tracking-tight"
            )}>
                {title}
            </h1>
            {description && (
                <p className="text-base text-muted-foreground max-w-2xl">{description}</p>
            )}
        </div>
        {children && <div className="flex w-full md:w-auto items-center justify-center gap-2">{children}</div>}
        <Separator className="w-1/2 mx-auto" />
    </div>
  );
}
