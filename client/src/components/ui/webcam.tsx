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
  aspectRatio,
  className,
  withFacingToggle = true
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<string>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initTimeoutRef = useRef<number | null>(null);

  // Camera initialization function - completely rewritten for stability
  const initCamera = useCallback(async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing) return;
    setIsInitializing(true);
    
    try {
      // Clean up any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      setCameraReady(false);
      setError(null);
      
      console.log("Starting camera initialization...");
      
      // Basic constraints that work on most devices
      const constraints: MediaStreamConstraints = {
        video: true,
        audio: false
      };
      
      // Get a raw stream first with minimal constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        // Attach stream to video element
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve();
            return;
          }
          
          const handleCanPlay = () => {
            console.log("Video can play now");
            resolve();
            videoRef.current?.removeEventListener('canplay', handleCanPlay);
          };
          
          // If video is already ready
          if (videoRef.current.readyState >= 3) {
            resolve();
          } else {
            videoRef.current.addEventListener('canplay', handleCanPlay);
          }
        });
        
        // Now try to play
        try {
          await videoRef.current.play();
          console.log("Video playback started");
          setCameraReady(true);
        } catch (e) {
          console.error("Video playback failed:", e);
          throw e;
        }
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      setError('Could not access camera. Please grant permission and try again.');
      
      // If the video element exists, clear it
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode]);

  // Initialize camera on component mount
  useEffect(() => {
    // We'll use a timeout to avoid race conditions and ensure DOM is ready
    initTimeoutRef.current = window.setTimeout(() => {
      initCamera();
    }, 500);
    
    return () => {
      // Cleanup function - make sure to cancel any pending operations
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [initCamera]);

  // Monitor video element for errors
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    const handleError = (e: Event) => {
      console.error("Video element error:", e);
      setCameraReady(false);
    };
    
    videoElement.addEventListener('error', handleError);
    
    return () => {
      videoElement.removeEventListener('error', handleError);
    };
  }, []);

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!videoRef.current || !cameraReady) return;

    try {
      const video = videoRef.current;
      
      // Use fixed dimensions if video is not showing dimensions correctly
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
      }
    } catch (err) {
      console.error("Error capturing image:", err);
    }
  }, [onCapture, cameraReady]);

  // Handle camera switch
  const toggleFacing = useCallback(() => {
    // Simply use the "Add from Gallery" option for now
    setError("Camera switching is currently unavailable. Please use the 'Add from Gallery' option instead.");
    
    /* Disabled facing mode toggle since it's causing instability
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    // Re-init camera with new facing mode
    initCamera();
    */
  }, []);

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      {error ? (
        <div className="bg-gray-900 w-full aspect-[4/3] flex flex-col items-center justify-center text-white p-4 text-center">
          <span className="material-icons text-4xl mb-2 text-red-400">error</span>
          <p className="mb-4">{error}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={initCamera} variant="outline" disabled={isInitializing}>
              {isInitializing ? 'Initializing...' : 'Retry Camera Access'}
            </Button>
            <p className="text-xs mt-2">
              If camera access fails, try using the "Add from Gallery" option below.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 w-full" style={{ aspectRatio: aspectRatio || 4/3 }}>
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
                disabled={!cameraReady || isInitializing}
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
