import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WebcamProps {
  onCapture: (imageData: string) => void;
  aspectRatio?: number;
  className?: string;
  withFacingToggle?: boolean;
}

export function Webcam({
  onCapture,
  aspectRatio = 4/3,
  className,
  withFacingToggle = true
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<string>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      if (stream) {
        // Stop previous stream
        stream.getTracks().forEach(track => track.stop());
      }

      setCameraReady(false);
      setError(null);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          aspectRatio
        },
        audio: false
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Error accessing camera', err);
      setError('Could not access camera. Please grant permission and try again.');
    }
  }, [facingMode, aspectRatio, stream]);

  // Initialize on component mount
  useEffect(() => {
    initCamera();

    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initCamera]);

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      onCapture(imageData);
    }
  }, [onCapture, cameraReady]);

  // Toggle camera facing mode
  const toggleFacing = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      {error ? (
        <div className="bg-gray-900 w-full aspect-[4/3] flex flex-col items-center justify-center text-white p-4 text-center">
          <span className="material-icons text-4xl mb-2 text-red-400">error</span>
          <p className="mb-4">{error}</p>
          <Button onClick={initCamera} variant="outline">Retry</Button>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 w-full" style={{ aspectRatio }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                <div className="flex flex-col items-center">
                  <span className="material-icons animate-spin mb-2">sync</span>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
            <Button 
              onClick={captureImage}
              disabled={!cameraReady}
              className="bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gray-100 p-0"
            >
              <div className="bg-primary rounded-full w-12 h-12"></div>
            </Button>
            
            {withFacingToggle && (
              <Button 
                onClick={toggleFacing}
                disabled={!cameraReady}
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-4 rounded-full"
              >
                <span className="material-icons">flip_camera_android</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
