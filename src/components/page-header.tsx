
import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8 text-center sm:text-left">
       <div className="grid gap-2">
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">{children}</div>}
    </div>
  );
}
