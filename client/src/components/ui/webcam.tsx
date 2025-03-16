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
  // Default to 4/3 which is more standard and widely supported
  aspectRatio,
  className,
  withFacingToggle = true
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<string>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize camera with improved error handling and fallbacks
  const initCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setCameraReady(false);
      setError(null);
      
      console.log("Attempting to access camera with facingMode:", facingMode);
      
      // Build constraints, making aspectRatio optional
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode
        },
        audio: false
      };
      
      // Only add aspectRatio if explicitly specified to avoid compatibility issues
      if (aspectRatio) {
        (constraints.video as MediaTrackConstraints).aspectRatio = aspectRatio;
      }

      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Camera access granted", newStream);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          // Play the video as soon as possible
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      } catch (err) {
        console.error('Failed with primary constraints, trying fallback', err);
        // Try again with minimal constraints if specific ones fail
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        console.log("Camera access granted with fallback", fallbackStream);
        setStream(fallbackStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      }
    } catch (err) {
      console.error('Error accessing camera', err);
      setError('Could not access camera. Please grant permission and try again.');
    }
  }, [facingMode, aspectRatio, stream]);

  // Handle video element events to better track readiness
  const setupVideoEvents = useCallback(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    // Multiple event handlers to catch various camera ready states
    const handleReady = () => {
      console.log("Camera stream ready");
      setCameraReady(true);
    };
    
    // Handle video errors
    const handleError = (e: Event) => {
      console.error("Video element error:", e);
      setCameraReady(false);
      setError("Error displaying camera feed. Please try again.");
    };
    
    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('loadedmetadata', handleReady);
    video.addEventListener('canplay', handleReady);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('loadedmetadata', handleReady);
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Initialize on component mount with retry mechanism
  useEffect(() => {
    const cleanup = setupVideoEvents();
    
    const initWithRetry = async () => {
      try {
        await initCamera();
      } catch (err) {
        console.error('Failed to initialize camera', err);
        if (retryCount < 3) {
          console.log(`Retrying camera initialization (${retryCount + 1}/3)...`);
          setRetryCount(prev => prev + 1);
          // Add a short delay before retrying
          setTimeout(initWithRetry, 1000);
        } else {
          setError('Could not access camera after multiple attempts. Please check your permissions and try again.');
        }
      }
    };
    
    initWithRetry();

    return () => {
      // Cleanup on unmount
      if (cleanup) cleanup();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initCamera, setupVideoEvents, retryCount]);

  // Re-initialize when facing mode changes
  useEffect(() => {
    if (retryCount === 0) {
      initCamera();
    }
  }, [facingMode, initCamera, retryCount]);

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    // Ensure we're using the actual video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the current video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert canvas to data URL (JPEG format)
      const imageData = canvas.toDataURL('image/jpeg', 0.9); // 0.9 quality for better performance
      onCapture(imageData);
    }
  }, [onCapture, cameraReady]);

  // Toggle camera facing mode
  const toggleFacing = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    // Reset retry count when manually changing camera
    setRetryCount(0);
  }, []);

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      {error ? (
        <div className="bg-gray-900 w-full aspect-[4/3] flex flex-col items-center justify-center text-white p-4 text-center">
          <span className="material-icons text-4xl mb-2 text-red-400">error</span>
          <p className="mb-4">{error}</p>
          <Button onClick={() => { setRetryCount(0); initCamera(); }} variant="outline">
            Retry
          </Button>
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
              style={{ display: cameraReady ? 'block' : 'none' }}
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
