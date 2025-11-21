
import * as React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col text-center items-center gap-4 md:flex-row md:items-center md:justify-between md:text-left mb-6 md:mb-8">
      <div className="grid gap-1">
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-xl mx-auto md:mx-0">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 w-full md:w-auto">{children}</div>}
    </div>
  );
}
