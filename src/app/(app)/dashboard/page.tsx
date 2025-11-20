'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Circle,
  Plus,
} from 'lucide-react';
import { chartData, metrics, roadmap } from '@/lib/data';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const chartConfig = {
  reach: {
    label: 'Reach',
  },
  engagement: {
    label: 'Engagement',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Welcome Back, Creator!"
        description="Here's a snapshot of your week and your plan."
      >
        <Button className="font-manrope">
          <Plus className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.name}
                </CardTitle>
                {metric.changeType === 'increase' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p
                  className={cn(
                    'text-xs',
                    metric.changeType === 'increase'
                      ? 'text-green-500'
                      : 'text-red-500'
                  )}
                >
                  {metric.change} from last week
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                   />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="reach"
                    fill="var(--color-reach)"
                    radius={4}
                    className="fill-primary"
                  />
                  <Bar
                    dataKey="engagement"
                    fill="var(--color-engagement)"
                    radius={4}
                    className="fill-accent"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Weekly Content Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {roadmap.map((item, index) => (
                  <li key={item.task}>
                    <div className="flex items-start gap-4">
                      {item.completed ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 text-accent" />
                      ) : (
                        <Circle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {item.day}: {item.task}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.details}
                        </p>
                      </div>
                    </div>
                    {index < roadmap.length - 1 && <Separator className="mt-4" />}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
