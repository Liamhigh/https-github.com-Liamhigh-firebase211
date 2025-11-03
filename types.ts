

export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface VerificationResult {
  notes: string;
  analyst: 'gemini' | 'openai';
  consultant: 'openai' | 'gemini' | 'none';
  verifier: 'openai' | 'gemini' | 'none';
}

export interface SealingMetadata {
  sha512: string;
  qrMeta: {
    createdAt: string;
    fileCount: number;
    hash: string;
  };
  pageCount: number;
  cloudAnchor?: {
    status: 'pending' | 'confirmed' | 'failed';
    storagePath?: string;
    firestoreId?: string;
    error?: string;
  };
}

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  content: string;
  files?: UploadedFile[];
  analysisResult?: AnalysisResult;
  verificationResult?: VerificationResult;
  sealingMetadata?: SealingMetadata;
  dualStrategies?: {
    gemini: string;
    openai: string;
  };
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  file: File; // Store the File object directly
  size: number;
  // Fix: Add optional base64 property for API usage.
  base64?: string;
  sha512?: string;
  addedAt?: string;
}

export interface AnalysisResult {
  summary: string;
  keyFindings: string;
  contradictions: string;
  draftLanguage: string;
  nextSteps: string;
  sealingMetadata: SealingMetadata;
}