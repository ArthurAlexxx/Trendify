'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/types';
import { AlertTriangle, Crown, RefreshCw } from 'lucide-react';

interface ProfileCompletionAlertProps {
    userProfile: UserProfile;
    isPremium: boolean;
}

export function ProfileCompletionAlert({ userProfile, isPremium }: ProfileCompletionAlertProps) {
    const hasAnyPlatform = userProfile.instagramHandle || userProfile.tiktokHandle;

    if (!userProfile.niche) {
      return (
          <Alert>
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertTitle>Complete seu Perfil!</AlertTitle>
              <AlertDescription>
                  <Link href="/profile" className='hover:underline font-semibold'>Adicione seu nicho de atuação</Link> para que a IA gere insights mais precisos.
              </AlertDescription>
          </Alert>
      )
    }

    if (!hasAnyPlatform && isPremium) {
         return (
             <Alert>
                <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
                    <div className='text-center sm:text-left'>
                        <AlertTitle className="flex items-center justify-center sm:justify-start gap-2">
                           <AlertTriangle className="h-4 w-4 text-primary" />
                           Conecte suas Plataformas!
                        </AlertTitle>
                        <AlertDescription>
                           Integre seu Instagram ou TikTok para começar a acompanhar suas métricas.
                        </AlertDescription>
                    </div>
                    <Button asChild className='w-full sm:w-auto'>
                       <Link href="/profile/integrations">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Conectar Plataformas
                       </Link>
                    </Button>
                </div>
            </Alert>
         )
    }
     if (!isPremium) {
         return (
             <Alert>
                <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
                    <div className='text-center sm:text-left'>
                        <AlertTitle className="flex items-center justify-center sm:justify-start gap-2">
                           <Crown className="h-4 w-4 text-yellow-500" />
                           Recurso Premium Disponível
                        </AlertTitle>
                        <AlertDescription>
                           Faça upgrade para o Premium e conecte suas redes para atualizar métricas automaticamente.
                        </AlertDescription>
                    </div>
                    <Button asChild className='w-full sm:w-auto'>
                       <Link href="/subscribe">Ver Planos</Link>
                    </Button>
                </div>
            </Alert>
         )
    }
    
    return null;
}
