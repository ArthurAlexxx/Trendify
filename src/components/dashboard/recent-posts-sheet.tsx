
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstagramProfileResults, TikTokProfileResults } from './platform-results';
import type { InstagramProfileData, TikTokProfileData, InstagramPostData, TikTokPost } from '@/lib/types';
import { Instagram, Film, Inbox, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface RecentPostsSheetProps {
  instaProfile: Partial<InstagramProfileData> | null;
  instaPosts: InstagramPostData[] | null;
  tiktokProfile: Partial<TikTokProfileData> | null;
  tiktokPosts: TikTokPost[] | null;
  isLoading: boolean;
  formatNumber: (n: number) => string;
  onTikTokClick: (post: TikTokPost) => void;
  children: React.ReactNode;
}

export function RecentPostsSheet({ 
    children, 
    instaProfile,
    instaPosts,
    tiktokProfile,
    tiktokPosts,
    isLoading,
    formatNumber,
    onTikTokClick,
}: RecentPostsSheetProps) {

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="font-headline text-xl text-center sm:text-left">Posts Sincronizados</SheetTitle>
           <SheetDescription className="text-center sm:text-left">
            Os últimos 10 posts de cada plataforma que você integrou.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className='flex-1'>
            <div className="p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                <Tabs defaultValue="instagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="instagram" disabled={!instaProfile}>
                            <Instagram className="mr-2 h-4 w-4"/> Instagram
                        </TabsTrigger>
                        <TabsTrigger value="tiktok" disabled={!tiktokProfile}>
                            <Film className="mr-2 h-4 w-4"/> TikTok
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="instagram" className="mt-4">
                        {instaProfile && instaPosts ? (
                            <>
                            <h3 className="text-base font-semibold flex items-center gap-2 mb-2">
                                <Avatar className="h-5 w-5"><AvatarImage src={instaProfile.profilePicUrlHd} /></Avatar>
                                Posts Recentes do Instagram
                            </h3>
                            <InstagramProfileResults profile={instaProfile} posts={instaPosts} formatNumber={formatNumber} error={null} />
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhum post do Instagram sincronizado.</p>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="tiktok" className="mt-4">
                        {tiktokProfile && tiktokPosts ? (
                            <>
                            <h3 className="text-base font-semibold flex items-center gap-2 mb-2">
                            <Avatar className="h-5 w-5"><AvatarImage src={tiktokProfile.avatarUrl} /></Avatar>
                                Vídeos Recentes do TikTok
                            </h3>
                            <TikTokProfileResults profile={tiktokProfile} posts={tiktokPosts} formatNumber={formatNumber} onVideoClick={onTikTokClick} error={null} />
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhum vídeo do TikTok sincronizado.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
                )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

    
