
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ElementType;
  imageUrl?: string | null;
}

export function PageHeader({ title, description, children, icon: Icon, imageUrl }: PageHeaderProps) {
  const hasImage = imageUrl;
  const hasIcon = Icon && !hasImage;

  return (
    <div className="flex flex-col items-center gap-8 w-full mb-12">
        <div className="flex flex-col items-center gap-4 text-center">
            {hasIcon && Icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
                    <Icon className="h-8 w-8" />
                </div>
            )}
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
                <p className="text-lg text-muted-foreground max-w-2xl">{description}</p>
            )}
        </div>
        {children && <div className="flex w-full md:w-auto items-center justify-center gap-2">{children}</div>}
        <Separator className="w-1/2 mx-auto" />
    </div>
  );
}
