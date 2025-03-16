import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleWebcam } from '@/components/ui/simple-webcam';

export default function TestPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [useSimple, setUseSimple] = useState(true);
  
  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Test Page</h1>
      <p className="mb-4">This page tests the camera functionality with a simplified implementation.</p>
      
      <div className="mb-4 max-w-md mx-auto">
        <SimpleWebcam onCapture={handleCapture} />
      </div>
      
      {capturedImage && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Captured Image</h2>
          <div className="border rounded-lg overflow-hidden">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full max-w-md mx-auto"
            />
          </div>
          <Button 
            className="mt-4"
            onClick={() => setCapturedImage(null)}
          >
            Clear Image
          </Button>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Info</h2>
        <p>If camera doesn't work:</p>
        <ul className="list-disc ml-5">
          <li>Check that your browser has permission to access the camera</li>
          <li>Try using a different browser</li>
          <li>On mobile, make sure the app has camera permissions</li>
        </ul>
      </div>
    </div>
  );
}