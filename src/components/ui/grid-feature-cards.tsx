
'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { Card } from './card';

type FeatureType = {
	title: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	description: string;
    plan: 'pro' | 'premium';
};

type FeatureCardPorps = React.ComponentProps<typeof Card> & {
	feature: FeatureType;
};

export function FeatureCard({ feature, className, ...props }: FeatureCardPorps) {
	return (
		<Card className={cn('relative overflow-hidden p-8', className)} {...props}>
			<feature.icon className="text-primary size-6" strokeWidth={1.5} aria-hidden />
			<h3 className="mt-6 text-sm font-semibold md:text-base">{feature.title}</h3>
			<p className="text-muted-foreground relative z-20 mt-2 text-xs font-light">{feature.description}</p>
		</Card>
	);
}
