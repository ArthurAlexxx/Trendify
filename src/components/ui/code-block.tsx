

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  value: string;
  language: string;
}

export function CodeBlock({ value, language, className, ...props }: CodeBlockProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
    toast({ title: 'Copiado!', description: 'O código foi copiado para a área de transferência.' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="relative font-mono text-sm">
      <pre
        className={cn('p-4 rounded-lg bg-muted/50 border overflow-x-auto', className)}
        {...props}
      >
        <code className={`language-${language}`}>{value}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="sr-only">Copiar código</span>
      </Button>
    </div>
  );
}
