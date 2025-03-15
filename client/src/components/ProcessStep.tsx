import React, { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTestGrader } from '@/context/TestGraderContext';
import { useTestGraderActions } from '@/hooks/use-test-grader';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function ProcessStep() {
  const { 
    capturedPages, 
    setStep, 
    processingPage, 
    totalProcessingPages, 
    processingProgress 
  } = useTestGrader();
  
  const { processImagesMutation } = useTestGraderActions();
  
  // Auto-start processing when this step is loaded
  useEffect(() => {
    if (capturedPages.length > 0 && !processingPage && processingProgress === 0) {
      processImagesMutation.mutate();
    }
  }, [capturedPages.length, processingPage, processingProgress, processImagesMutation]);
  
  // Handle back button
  const handleBack = useCallback(() => {
    if (processImagesMutation.isPending) {
      if (!confirm('Processing is in progress. Going back will cancel it. Continue?')) {
        return;
      }
    }
    setStep('capture');
  }, [setStep, processImagesMutation.isPending]);
  
  // Handle next button
  const handleNext = useCallback(() => {
    setStep('results');
  }, [setStep]);
  
  // Processing is complete when progress is 100 or all pages are processed
  const isProcessingComplete = processingProgress === 100 || 
    (processingPage === totalProcessingPages && totalProcessingPages > 0);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Process Answer Sheets</h2>
      <p className="text-sm text-gray-600 mb-5">
        The app will now process the images to extract student answers using AI.
      </p>
      
      {/* Processing Status */}
      <div className="mb-6">
        <div className="flex flex-col items-center justify-center py-8">
          {processImagesMutation.isPending ? (
            <>
              <div className="relative mb-4">
                <div className="w-20 h-20 border-4 border-t-primary border-gray-200 rounded-full animate-spin"></div>
                <span className="material-icons text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">auto_fix_high</span>
              </div>
              <div className="text-center mb-4">
                <h3 className="text-base font-medium text-gray-800 mb-1">Processing Images</h3>
                <p className="text-sm text-gray-600">
                  {processingPage ? `Extracting answers from page ${processingPage}...` : 'Preparing to process...'}
                </p>
              </div>
              <div className="w-full max-w-xs mb-2">
                <Progress value={processingProgress} className="h-2" />
              </div>
              <p className="text-xs text-gray-500">
                <span>{processingPage || 0}</span> of <span>{totalProcessingPages}</span> pages processed
              </p>
            </>
          ) : isProcessingComplete ? (
            <div className="w-full">
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-start mb-5">
                <span className="material-icons text-success mr-3">check_circle</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1">Processing Complete</h3>
                  <p className="text-xs text-gray-600">
                    All answer sheets have been successfully processed and answers extracted.
                  </p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Extracted Answers</h3>
                </div>
                <div className="p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(capturedPages.reduce((acc, page) => {
                      if (page.extractedAnswers) {
                        return { ...acc, ...page.extractedAnswers };
                      }
                      return acc;
                    }, {})).sort(([a], [b]) => Number(a) - Number(b)).map(([questionNumber, answer]) => (
                      <div key={questionNumber} className="border border-gray-200 rounded-lg p-2 flex flex-col items-center">
                        <span className="text-xs text-gray-500">Q{questionNumber}</span>
                        <span className="text-lg font-medium text-gray-800">{answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="material-icons text-4xl text-gray-400 mb-2">auto_fix_high</span>
              <h3 className="text-base font-medium text-gray-800 mb-1">Ready to Process</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click the button below to start processing {capturedPages.length} image{capturedPages.length !== 1 ? 's' : ''}.
              </p>
              <Button onClick={() => processImagesMutation.mutate()}>
                Start Processing
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          className="border border-gray-300 hover:bg-gray-50 text-gray-700"
          disabled={processImagesMutation.isPending}
        >
          <span className="material-icons mr-1">arrow_back</span>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isProcessingComplete || processImagesMutation.isPending}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          View Results
          <span className="material-icons ml-1">arrow_forward</span>
        </Button>
      </div>
    </div>
  );
}
