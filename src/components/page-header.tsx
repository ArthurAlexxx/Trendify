
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ElementType;
}

export function PageHeader({ title, description, children, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full mb-12">
        <div className="flex flex-col items-center gap-4 text-center">
            {Icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
                    <Icon className="h-8 w-8" />
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
