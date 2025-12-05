
import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ElementType;
}

export function PageHeader({ title, description, children, icon: Icon }: PageHeaderProps) {
  return (
     <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left w-full mb-8">
      <div className="grid gap-2 flex-1">
        <div className="flex flex-col items-center md:items-start gap-2">
            {Icon && <Icon className="h-8 w-8 text-primary" />}
            <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tighter text-foreground">
            {title}
            </h1>
        </div>
        {description && (
          <p className="text-lg text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex w-full md:w-auto items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
