export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED'
}

export enum FileCategory {
  WORK = '01_Work',
  PERSONAL = '02_Personal',
  FINANCE = '03_Finance',
  LEGAL = '04_Legal',
  PHOTOS_VIDEOS = '05_Photos_Videos',
  LEARNING = '06_Learning',
  TEMPLATES = '07_Templates',
  ARCHIVE = '99_Archive'
}

export type SensitivityLevel = 'Normal' | 'Confidential' | 'High Risk';

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  contentSnippet?: string; // Simulating read content
  lastModified: number;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[]; // Required to move files (we need to know current parent to remove it)
}

export interface AnalysisResult {
  fileId: string;
  category: FileCategory;
  suggestedPath: string;
  suggestedName: string;
  shouldArchive: boolean;
  sensitivity: SensitivityLevel;
  reasoning: string;
  confidence: number;
}

export interface ProcessedFile extends DriveFile {
  analysis?: AnalysisResult;
  status: 'pending' | 'approved' | 'rejected' | 'synced' | 'error';
}
