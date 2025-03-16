import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Webcam } from '@/components/ui/webcam';

export default function TestPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Test Page</h1>
      
      <div className="mb-4 max-w-md mx-auto">
        <Webcam onCapture={handleCapture} />
      </div>
      
      {capturedImage && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Captured Image</h2>
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full max-w-md mx-auto border rounded-lg"
          />
          <Button 
            className="mt-4"
            onClick={() => setCapturedImage(null)}
          >
            Clear Image
          </Button>
        </div>
      )}
    </div>
  );
}