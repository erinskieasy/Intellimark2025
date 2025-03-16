export interface MarkSchemeEntry {
  id?: number;
  questionNumber: number;
  expectedAnswer: string;
  points: number;
  testId: number;
}

export interface Test {
  id?: number;
  name: string;
  totalQuestions: number;
  totalPoints: number;
}

export interface Page {
  id?: number;
  imageData: string; // Base64 encoded image
  pageNumber: number;
  testId: number;
  processed: boolean;
  extractedAnswers?: Record<string, string>;
}

export interface Result {
  id?: number;
  testId: number;
  studentAnswers: Record<string, string>;
  pointsEarned: number;
  totalPoints: number;
  scorePercentage: number;
}

export interface DetailedResultItem {
  questionNumber: number;
  studentAnswer: string;
  expectedAnswer: string;
  points: number;
  earnedPoints: number;
  correct: boolean;
}

export interface Settings {
  id?: number;
  answerRecognitionInstructions: string;
  enhancedRecognition: boolean;
  confidenceThreshold: number;
  temperature?: number;
  topP?: number;
}

export interface ExtractedAnswerResponse {
  page: Page;
  extractedAnswers: Record<string, string>;
  confidence: number;
}

export type TestGraderStep = 'mark-scheme' | 'capture' | 'process' | 'results';
