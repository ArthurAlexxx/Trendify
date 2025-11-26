
import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex w-full md:w-auto items-center gap-2">{children}</div>}
    </div>
  );
}
