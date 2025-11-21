
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
    <div className="flex flex-col text-center items-center gap-4 mb-6 md:mb-8">
       {icon && (
         <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
            {React.cloneElement(icon as React.ReactElement, { className: 'h-8 w-8 text-primary' })}
         </div>
       )}
      <div className="grid gap-2">
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary">
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
