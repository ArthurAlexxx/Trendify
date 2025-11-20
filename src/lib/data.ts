import { Metric, MetricDataPoint, RoadmapItem, Trend } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const metrics: Metric[] = [
  { name: 'Total Reach', value: '1.2M', change: '+12.5%', changeType: 'increase' },
  { name: 'Engagement Rate', value: '4.7%', change: '-0.2%', changeType: 'decrease' },
  { name: 'Followers', value: '250.3K', change: '+1,200', changeType: 'increase' },
  { name: 'Profile Views', value: '89.1K', change: '+20.1%', changeType: 'increase' },
];

export const chartData: MetricDataPoint[] = [
  { date: 'Mon', reach: 4000, engagement: 2400 },
  { date: 'Tue', reach: 3000, engagement: 1398 },
  { date: 'Wed', reach: 2000, engagement: 9800 },
  { date: 'Thu', reach: 2780, engagement: 3908 },
  { date: 'Fri', reach: 1890, engagement: 4800 },
  { date: 'Sat', reach: 2390, engagement: 3800 },
  { date: 'Sun', reach: 3490, engagement: 4300 },
];

export const roadmap: RoadmapItem[] = [
  { day: 'Monday', task: 'Film "GRWM" Video', details: 'Use trending sound #1 from Trend Radar.', completed: true },
  { day: 'Tuesday', task: 'Edit & Schedule Reel', details: 'Post at 6 PM for max engagement.', completed: true },
  { day: 'Wednesday', task: 'Brainstorm New Ideas', details: 'Use AI Video Ideas generator for "skincare" topic.', completed: false },
  { day: 'Thursday', task: 'Engage with Community', details: 'Respond to comments and DMs for 1 hour.', completed: false },
  { day: 'Friday', task: 'Post Story Q&A', details: 'Gather audience questions for next week.', completed: false },
];

const trendExample1 = PlaceHolderImages.find(p => p.id === 'trend-example-1');
const trendExample2 = PlaceHolderImages.find(p => p.id === 'trend-example-2');

export const trends: Trend[] = [
  {
    id: '1',
    title: '80s Synth Pop Throwback',
    type: 'Sound',
    niche: 'Fashion',
    country: 'USA',
    countdown: 3,
    explainer: 'Use this sound for outfit transition videos. Quick cuts and vintage filters work best.',
    exampleImageUrl: trendExample1?.imageUrl ?? '',
    exampleImageHint: trendExample1?.imageHint ?? ''
  },
  {
    id: '2',
    title: 'Gourmet at Home',
    type: 'Style',
    niche: 'Food',
    country: 'Global',
    countdown: 5,
    explainer: 'A video style featuring close-ups and ASMR sounds of cooking a fancy meal.',
    exampleImageUrl: trendExample2?.imageUrl ?? '',
    exampleImageHint: trendExample2?.imageHint ?? ''
  },
  {
    id: '3',
    title: 'Upbeat Indie Pop',
    type: 'Sound',
    niche: 'Lifestyle',
    country: 'UK',
    countdown: 7,
    explainer: 'Perfect for montages of your day, travel clips, or a "photo dump" style video.',
    exampleImageUrl: trendExample1?.imageUrl ?? '',
    exampleImageHint: 'travel life'
  },
];
