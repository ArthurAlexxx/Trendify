
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
    <div className="flex flex-col items-center justify-center gap-4 mb-8 md:mb-12 text-center">
      {icon && 
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-2">
            {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8" })}
        </div>
      }
      <div className="grid gap-1">
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-gradient bg-gradient-to-br from-purple-600 to-indigo-600">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
