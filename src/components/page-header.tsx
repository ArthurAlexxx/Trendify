
import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col text-center items-center gap-4 mb-6 md:mb-8">
      <div className="grid gap-2">
        <h1 className={cn(
            "text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary",
            !description && "text-foreground"
        )}>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
