export enum Sender {
  User = 'USER',
  System = 'SHROVATE'
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  audioData?: string; // Base64 raw PCM audio data
  webSources?: WebSource[];
  timestamp: number;
  isError?: boolean;
}

export interface SystemMetric {
  name: string;
  value: number;
  fullMark: number;
}