
export interface CommentData {
  id: string;
  imageSource: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  topic: string;
  theme: string;
}

export interface AnalysisStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  themes: Record<string, number>;
  topics: Record<string, number>;
}

export type AppState = 'idle' | 'analyzing' | 'complete' | 'error';

export interface FileWithPreview extends File {
  preview: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string; // Nom d'affichage
  password: string;
  createdAt: number;
}

// New Hierarchy Types

export type PlatformId = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'linkedin';

export interface Post {
  id: string;
  name: string;
  createdAt: number;
  files: FileWithPreview[];
  data: CommentData[];
  appState: AppState;
}

export interface PlatformFolder {
  id: PlatformId;
  name: string;
  icon: string; // Storing icon name for dynamic rendering
  posts: Post[];
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
  folders: PlatformFolder[];
}
