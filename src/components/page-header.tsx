
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
         <div className="flex items-center justify-center h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6 md:h-8 md:w-8 text-indigo-400' })}
         </div>
       )}
      <div className="grid gap-2">
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-white">
          {title}
        </h1>
        {description && (
          <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
