import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: {
    template: '%s | Trendify',
    default: 'Trendify',
  },
  description: 'Ferramentas com IA para ajudar criadores a crescer e monetizar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Satoshi:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'font-body antialiased',
          'min-h-screen bg-background text-foreground'
        )}
      >
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
      </body>
    </html>
  );
}
