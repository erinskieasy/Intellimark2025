import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MarkSchemeEntry, Page, Test, TestGraderStep, Result, DetailedResultItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TestGraderContextType {
  // State
  currentStep: TestGraderStep;
  currentTest: Test | null;
  markScheme: MarkSchemeEntry[];
  capturedPages: Page[];
  testResult: Result | null;
  detailedResults: DetailedResultItem[];
  processingPage: number | null;
  totalProcessingPages: number;
  processingProgress: number;
  
  // Actions
  setStep: (step: TestGraderStep) => void;
  setCurrentTest: (test: Test | null) => void;
  setMarkScheme: (markScheme: MarkSchemeEntry[]) => void;
  addCapturedPage: (page: Page) => void;
  removeCapturedPage: (pageNumber: number) => void;
  clearCapturedPages: () => void;
  setTestResult: (result: Result | null) => void;
  setDetailedResults: (results: DetailedResultItem[]) => void;
  startProcessing: (totalPages: number) => void;
  updateProcessingStatus: (pageNumber: number, progress: number) => void;
  finishProcessing: () => void;
  resetTestGrader: () => void;
}

const TestGraderContext = createContext<TestGraderContextType | undefined>(undefined);

export function TestGraderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // State for the grading process
  const [currentStep, setCurrentStep] = useState<TestGraderStep>('mark-scheme');
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [markScheme, setMarkScheme] = useState<MarkSchemeEntry[]>([]);
  const [capturedPages, setCapturedPages] = useState<Page[]>([]);
  const [testResult, setTestResult] = useState<Result | null>(null);
  const [detailedResults, setDetailedResults] = useState<DetailedResultItem[]>([]);
  
  // State for processing status
  const [processingPage, setProcessingPage] = useState<number | null>(null);
  const [totalProcessingPages, setTotalProcessingPages] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  
  // Navigate between steps
  const setStep = useCallback((step: TestGraderStep) => {
    setCurrentStep(step);
  }, []);
  
  // Add a captured page
  const addCapturedPage = useCallback((page: Page) => {
    setCapturedPages(prev => {
      // Check if page with same number exists and replace it
      const exists = prev.some(p => p.pageNumber === page.pageNumber);
      if (exists) {
        return prev.map(p => p.pageNumber === page.pageNumber ? page : p);
      }
      return [...prev, page];
    });
  }, []);
  
  // Remove a captured page
  const removeCapturedPage = useCallback((pageNumber: number) => {
    setCapturedPages(prev => prev.filter(p => p.pageNumber !== pageNumber));
  }, []);
  
  // Clear all captured pages
  const clearCapturedPages = useCallback(() => {
    setCapturedPages([]);
  }, []);
  
  // Start processing images
  const startProcessing = useCallback((totalPages: number) => {
    setTotalProcessingPages(totalPages);
    setProcessingPage(1);
    setProcessingProgress(0);
  }, []);
  
  // Update processing status
  const updateProcessingStatus = useCallback((pageNumber: number, progress: number) => {
    setProcessingPage(pageNumber);
    setProcessingProgress(progress);
  }, []);
  
  // Finish processing
  const finishProcessing = useCallback(() => {
    setProcessingPage(null);
    setProcessingProgress(100);
    toast({
      title: "Processing complete",
      description: "All answer sheets have been successfully processed."
    });
  }, [toast]);
  
  // Reset the entire test grader
  const resetTestGrader = useCallback(() => {
    setCurrentStep('mark-scheme');
    setCurrentTest(null);
    setMarkScheme([]);
    setCapturedPages([]);
    setTestResult(null);
    setDetailedResults([]);
    setProcessingPage(null);
    setTotalProcessingPages(0);
    setProcessingProgress(0);
  }, []);
  
  const value = {
    // State
    currentStep,
    currentTest,
    markScheme,
    capturedPages,
    testResult,
    detailedResults,
    processingPage,
    totalProcessingPages,
    processingProgress,
    
    // Actions
    setStep,
    setCurrentTest,
    setMarkScheme,
    addCapturedPage,
    removeCapturedPage,
    clearCapturedPages,
    setTestResult,
    setDetailedResults,
    startProcessing,
    updateProcessingStatus,
    finishProcessing,
    resetTestGrader
  };
  
  return (
    <TestGraderContext.Provider value={value}>
      {children}
    </TestGraderContext.Provider>
  );
}

export function useTestGrader() {
  const context = useContext(TestGraderContext);
  if (context === undefined) {
    throw new Error('useTestGrader must be used within a TestGraderProvider');
  }
  return context;
}
