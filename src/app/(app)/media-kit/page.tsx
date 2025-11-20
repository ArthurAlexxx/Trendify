'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Download, Link as LinkIcon, Instagram, Youtube, User, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const creatorProfileImage = PlaceHolderImages.find(p => p.id === 'creator-profile');
const caseStudyImage1 = PlaceHolderImages.find(p => p.id === 'case-study-1');
const caseStudyImage2 = PlaceHolderImages.find(p => p.id === 'case-study-2');


export default function MediaKitPage() {
    const [name, setName] = useState('Jessica Day');
    const [bio, setBio] = useState('Lifestyle and fashion creator based in LA. Passionate about sustainable brands and authentic storytelling. Let\'s create something beautiful together!');
    const [followers, setFollowers] = useState('250K');
    const [engagement, setEngagement] = useState('4.7%');
    const [audience, setAudience] = useState('Ages 18-24, 75% Female, Top locations: USA, UK, Canada');
    
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <PageHeader
          title="Automated Media Kit"
          description="Fill in your details to generate a professional media kit."
        />
        <Card>
            <CardHeader>
                <CardTitle>Creator Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="followers">Total Followers</Label>
                        <Input id="followers" value={followers} onChange={(e) => setFollowers(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="engagement">Engagement Rate</Label>
                        <Input id="engagement" value={engagement} onChange={(e) => setEngagement(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="audience">Audience Demographics</Label>
                    <Textarea id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
                </div>
            </CardContent>
        </Card>
      </div>
      <div>
        <div className="sticky top-8">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-headline font-bold">Live Preview</h2>
                 <div className="flex gap-2">
                    <Button variant="outline"><LinkIcon className="h-4 w-4 mr-2"/>Get Link</Button>
                    <Button className="font-manrope"><Download className="h-4 w-4 mr-2"/>Export PDF</Button>
                 </div>
            </div>
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-primary/10 p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-background">
                         <Image 
                            src={creatorProfileImage?.imageUrl ?? ''} 
                            alt="Creator" 
                            fill
                            style={{objectFit: 'cover'}}
                            data-ai-hint={creatorProfileImage?.imageHint}
                        />
                    </div>
                    <div>
                        <h1 className="text-4xl font-headline font-black text-center md:text-left">{name}</h1>
                        <div className="flex gap-4 mt-2 justify-center md:justify-start">
                            <span className="flex items-center gap-1 text-sm"><Instagram className="h-4 w-4" />@jessday</span>
                            <span className="flex items-center gap-1 text-sm"><Youtube className="h-4 w-4" />JessicaDayVlogs</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-8 grid gap-8">
                <div>
                    <h3 className="font-headline font-bold text-lg mb-2">About Me</h3>
                    <p className="text-muted-foreground text-sm">{bio}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-headline font-bold text-lg mb-2 flex items-center gap-2"><BarChart2 className="h-5 w-5" /> Key Metrics</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong>Followers:</strong> {followers}</p>
                            <p><strong>Engagement:</strong> {engagement}</p>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-headline font-bold text-lg mb-2 flex items-center gap-2"><User className="h-5 w-5" /> Audience</h3>
                        <p className="text-muted-foreground text-sm">{audience}</p>
                    </div>
                </div>
                 <Separator />
                 <div>
                    <h3 className="font-headline font-bold text-lg mb-4">Case Studies</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <CaseStudyCard 
                            image={caseStudyImage1?.imageUrl ?? ''}
                            hint={caseStudyImage1?.imageHint ?? ''}
                            title="Aura Cosmetics"
                            results="1.5M+ Views, 20% Increase in Sales"
                        />
                         <CaseStudyCard 
                            image={caseStudyImage2?.imageUrl ?? ''}
                            hint={caseStudyImage2?.imageHint ?? ''}
                            title="Chic Threads Boutique"
                            results="3M+ Reach, Sold Out Collection"
                        />
                    </div>
                </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CaseStudyCard({image, hint, title, results}: {image: string, hint: string, title: string, results: string}) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="relative h-32 w-full">
                <Image src={image} alt={title} fill style={{objectFit: 'cover'}} data-ai-hint={hint} />
            </div>
            <div className="p-3">
                <h4 className="font-bold text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground">{results}</p>
            </div>
        </div>
    )
}
