
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ElementType;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
}

export function PageHeader({ title, description, children, icon: Icon, imageUrl1, imageUrl2 }: PageHeaderProps) {
  const hasOneImage = imageUrl1 && !imageUrl2;
  const hasTwoImages = imageUrl1 && imageUrl2;
  const hasIcon = Icon && !hasOneImage && !hasTwoImages;

  return (
    <div className="flex flex-col items-center gap-8 w-full mb-12">
        <div className="flex flex-col items-center gap-4 text-center">
            {hasIcon && Icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
                    <Icon className="h-8 w-8" />
                </div>
            )}
            {hasOneImage && (
                <div className='relative group'>
                    <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/20 mb-2">
                        <AvatarImage src={imageUrl1 ?? undefined} />
                        <AvatarFallback>{title?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            )}
            {hasTwoImages && (
                 <div className="relative h-16 w-16 rounded-2xl border-2 border-primary/20 mb-2 overflow-hidden bg-muted">
                    <Avatar className="absolute h-full w-[55%] top-0 left-0 rounded-none">
                        <AvatarImage src={imageUrl1 ?? undefined} style={{ objectFit: 'cover', height: '100%', width: '100%' }}/>
                        <AvatarFallback>{title?.[0]}</AvatarFallback>
                    </Avatar>
                     <Avatar className="absolute h-full w-[55%] top-0 right-0 rounded-none">
                        <AvatarImage src={imageUrl2 ?? undefined} style={{ objectFit: 'cover', height: '100%', width: '100%' }}/>
                        <AvatarFallback>{title?.[1]}</AvatarFallback>
                    </Avatar>
                </div>
            )}
            <h1 className={cn(
                "text-3xl md:text-4xl font-bold font-headline tracking-tighter",
                "bg-gradient-to-r from-primary via-purple-500 to-violet-600 bg-clip-text text-transparent",
                "[text-shadow:0_0_15px_hsl(var(--primary)/30%)]"
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
