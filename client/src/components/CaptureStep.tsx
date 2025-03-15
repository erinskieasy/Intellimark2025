import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Webcam } from '@/components/ui/webcam';
import { useTestGrader } from '@/context/TestGraderContext';
import { useTestGraderActions } from '@/hooks/use-test-grader';
import { useToast } from '@/hooks/use-toast';
import { dataURLtoBlob } from '@/lib/utils';

export default function CaptureStep() {
  const [isCapturing, setIsCapturing] = useState(true);
  const { toast } = useToast();
  const { capturedPages, currentTest, setStep } = useTestGrader();
  const { captureImageMutation } = useTestGraderActions();
  
  // Handle image capture
  const handleCapture = useCallback((imageData: string) => {
    if (!currentTest?.id) {
      toast({
        title: 'Error',
        description: 'No active test',
        variant: 'destructive'
      });
      return;
    }
    
    captureImageMutation.mutate({
      imageData,
      pageNumber: capturedPages.length + 1,
      testId: currentTest.id
    });
  }, [captureImageMutation, capturedPages.length, currentTest, toast]);
  
  // Handle file upload from gallery
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTest?.id) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      captureImageMutation.mutate({
        imageData,
        pageNumber: capturedPages.length + 1,
        testId: currentTest.id!
      });
    };
    reader.readAsDataURL(file);
    
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  }, [captureImageMutation, capturedPages.length, currentTest]);
  
  // Handle delete image
  const handleDeleteImage = useCallback((pageNumber: number) => {
    const page = capturedPages.find(p => p.pageNumber === pageNumber);
    if (!page) return;
    
    // Confirm before deleting
    if (confirm(`Are you sure you want to delete page ${pageNumber}?`)) {
      // Use the removeCapturedPage from context
      useTestGrader().removeCapturedPage(pageNumber);
    }
  }, [capturedPages]);
  
  // Handle back button
  const handleBack = useCallback(() => {
    setStep('mark-scheme');
  }, [setStep]);
  
  // Handle next button
  const handleNext = useCallback(() => {
    if (capturedPages.length === 0) {
      toast({
        title: 'No Pages Captured',
        description: 'Please capture at least one answer sheet before proceeding.',
        variant: 'destructive'
      });
      return;
    }
    
    setStep('process');
  }, [capturedPages.length, setStep, toast]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Capture Answer Sheets</h2>
      <p className="text-sm text-gray-600 mb-5">
        Use your camera to capture each page of the student's answer sheet. Make sure the answers are clearly visible.
      </p>
      
      {/* Camera Interface */}
      {isCapturing && (
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
          <Webcam 
            onCapture={handleCapture}
            aspectRatio={3/4}
          />
        </div>
      )}
      
      {/* Captured Images */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Captured Pages</h3>
          <span className="text-xs text-gray-500">{capturedPages.length} pages</span>
        </div>
        
        {capturedPages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {capturedPages.map((page) => (
              <div key={page.pageNumber} className="aspect-[3/4] bg-gray-100 rounded-lg relative overflow-hidden shadow-sm">
                <img 
                  src={page.imageData} 
                  alt={`Captured answer sheet page ${page.pageNumber}`} 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => handleDeleteImage(page.pageNumber)}
                  className="absolute top-1 right-1 bg-white bg-opacity-70 rounded-full p-1 shadow-sm"
                >
                  <span className="material-icons text-red-500 text-sm">delete</span>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2">
                  Page {page.pageNumber}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <span className="material-icons text-gray-400 text-3xl mb-2">photo_library</span>
            <p className="text-sm text-gray-500">No pages captured yet. Use the camera above to capture answer sheets.</p>
          </div>
        )}
        
        <div className="flex items-center justify-center mt-3">
          <input
            type="file"
            accept="image/*"
            id="gallery-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={captureImageMutation.isPending}
          />
          <label htmlFor="gallery-upload">
            <Button
              variant="outline"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer"
              disabled={captureImageMutation.isPending}
              asChild
            >
              <span>
                <span className="material-icons mr-1 text-sm">add</span>
                Add from Gallery
              </span>
            </Button>
          </label>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          className="border border-gray-300 hover:bg-gray-50 text-gray-700"
        >
          <span className="material-icons mr-1">arrow_back</span>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={capturedPages.length === 0 || captureImageMutation.isPending}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          Next
          <span className="material-icons ml-1">arrow_forward</span>
        </Button>
      </div>
    </div>
  );
}
