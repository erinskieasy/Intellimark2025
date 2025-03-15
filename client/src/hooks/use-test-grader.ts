import { useState } from 'react';
import { useTestGrader } from '@/context/TestGraderContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Test, Page, Result, MarkSchemeEntry } from '@/types';
import { parseExcelMarkScheme } from '@/lib/utils';

export function useTestGraderActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    setCurrentTest,
    setMarkScheme,
    addCapturedPage,
    removeCapturedPage,
    setTestResult,
    setDetailedResults,
    startProcessing,
    updateProcessingStatus,
    finishProcessing,
    setStep,
    capturedPages,
    currentTest
  } = useTestGrader();
  
  const [excelParseError, setExcelParseError] = useState<string | null>(null);
  
  // Create a new test
  const createTestMutation = useMutation({
    mutationFn: async (testData: Omit<Test, 'id'>) => {
      const res = await apiRequest('POST', '/api/tests', testData);
      return res.json() as Promise<Test>;
    },
    onSuccess: (data) => {
      setCurrentTest(data);
      toast({
        title: 'Test created',
        description: `Test "${data.name}" has been created successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating test',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Upload mark scheme
  const uploadMarkSchemeMutation = useMutation({
    mutationFn: async ({ 
      file, 
      testId 
    }: { 
      file: File, 
      testId: number 
    }) => {
      try {
        // First parse the Excel file client-side
        const markSchemeData = await parseExcelMarkScheme(file);
        setExcelParseError(null);
        
        // Then send parsed data to server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('testId', testId.toString());
        formData.append('markSchemeData', JSON.stringify(markSchemeData));
        
        const res = await fetch('/api/mark-scheme', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || res.statusText);
        }
        
        return res.json();
      } catch (error) {
        if (error instanceof Error) {
          setExcelParseError(error.message);
          throw error;
        }
        throw new Error('Failed to parse Excel file');
      }
    },
    onSuccess: (data) => {
      setMarkScheme(data.entries);
      toast({
        title: 'Mark scheme uploaded',
        description: `${data.entries.length} questions loaded successfully.`
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mark-scheme/${currentTest?.id}`] });
      setStep('capture');
    },
    onError: (error) => {
      toast({
        title: 'Error uploading mark scheme',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Capture an image
  const captureImageMutation = useMutation({
    mutationFn: async ({ 
      imageData, 
      pageNumber,
      testId 
    }: { 
      imageData: string, 
      pageNumber: number,
      testId: number 
    }) => {
      const res = await apiRequest('POST', '/api/pages', {
        imageData,
        pageNumber,
        testId
      });
      return res.json() as Promise<Page>;
    },
    onSuccess: (data) => {
      addCapturedPage(data);
      toast({
        title: 'Image captured',
        description: `Page ${data.pageNumber} has been captured.`
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${currentTest?.id}`] });
    },
    onError: (error) => {
      toast({
        title: 'Error capturing image',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Process images
  const processImagesMutation = useMutation({
    mutationFn: async () => {
      if (!currentTest) throw new Error('No active test');
      if (capturedPages.length === 0) throw new Error('No pages to process');
      
      startProcessing(capturedPages.length);
      
      const results: Record<string, string> = {};
      
      // Process each page sequentially
      for (let i = 0; i < capturedPages.length; i++) {
        const page = capturedPages[i];
        
        // Update processing status
        updateProcessingStatus(i + 1, (i / capturedPages.length) * 100);
        
        // Process the image
        const res = await apiRequest('POST', `/api/pages/${page.id}/process`, {});
        const data = await res.json();
        
        // Merge the extracted answers
        Object.assign(results, data.extractedAnswers);
        
        // Update progress
        updateProcessingStatus(i + 1, ((i + 1) / capturedPages.length) * 100);
      }
      
      // Calculate the score
      const markSchemeRes = await fetch(`/api/mark-scheme/${currentTest.id}`, {
        credentials: 'include'
      });
      const markScheme = await markSchemeRes.json() as MarkSchemeEntry[];
      
      let pointsEarned = 0;
      let totalPoints = 0;
      
      markScheme.forEach(entry => {
        totalPoints += entry.points;
        
        const studentAnswer = results[entry.questionNumber.toString()];
        if (studentAnswer && studentAnswer.toUpperCase() === entry.expectedAnswer.toUpperCase()) {
          pointsEarned += entry.points;
        }
      });
      
      const scorePercentage = Math.round((pointsEarned / totalPoints) * 100);
      
      // Save the result
      const resultRes = await apiRequest('POST', '/api/results', {
        testId: currentTest.id,
        studentAnswers: results,
        pointsEarned,
        totalPoints,
        scorePercentage
      });
      
      const result = await resultRes.json() as Result;
      
      // Get detailed results
      const detailedRes = await fetch(`/api/results/${currentTest.id}/detailed`, {
        credentials: 'include'
      });
      const detailedResults = await detailedRes.json();
      
      return { result, detailedResults };
    },
    onSuccess: ({ result, detailedResults }) => {
      setTestResult(result);
      setDetailedResults(detailedResults);
      finishProcessing();
      
      toast({
        title: 'Processing complete',
        description: `Score: ${result.scorePercentage}% (${result.pointsEarned}/${result.totalPoints} points)`
      });
      
      setStep('results');
      
      queryClient.invalidateQueries({ queryKey: [`/api/results/${currentTest?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/results/${currentTest?.id}/detailed`] });
    },
    onError: (error) => {
      toast({
        title: 'Error processing images',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Get details for the current test
  const { data: testDetails } = useQuery({
    queryKey: currentTest ? [`/api/tests/${currentTest.id}`] : null,
    enabled: !!currentTest
  });
  
  // Get mark scheme for the current test
  const { data: testMarkScheme } = useQuery({
    queryKey: currentTest ? [`/api/mark-scheme/${currentTest.id}`] : null,
    enabled: !!currentTest
  });
  
  return {
    // Mutations
    createTestMutation,
    uploadMarkSchemeMutation,
    captureImageMutation,
    processImagesMutation,
    
    // Query data
    testDetails,
    testMarkScheme,
    
    // Excel parsing error
    excelParseError
  };
}
