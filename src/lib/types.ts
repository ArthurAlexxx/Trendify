export interface Metric {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

export interface MetricDataPoint {
  date: string;
  reach: number;
  engagement: number;
}

export interface RoadmapItem {
  day: string;
  task: string;
  details: string;
  completed: boolean;
}

export interface Trend {
  id: string;
  title: string;
  type: 'Sound' | 'Style';
  niche: string;
  country: string;
  countdown: number;
  explainer: string;
  exampleImageUrl: string;
  exampleImageHint: string;
}
