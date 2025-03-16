import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SimpleWebcamProps {
  onCapture: (imageData: string) => void;
  className?: string;
  withFacingToggle?: boolean;
}

export function SimpleWebcam({ onCapture, className, withFacingToggle = true }: SimpleWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasFrontAndBack, setHasFrontAndBack] = useState(false);
  
  // Start camera with current facing mode
  const startCamera = useCallback(async () => {
    // Skip if already initializing
    if (isInitializing) return;
    
    // Set initializing flag
    setIsInitializing(true);
    
    // Reset state
    setIsReady(false);
    setError(null);
    
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    let videoStream: MediaStream | null = null;
    
    try {
      console.log(`Simple camera: starting initialization (facingMode: ${facingMode})`);
      
      // Check for multiple cameras first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const hasMultipleCameras = videoDevices.length > 1;
        setHasFrontAndBack(hasMultipleCameras);
        console.log(`Simple camera: detected ${videoDevices.length} cameras`);
      } catch (deviceErr) {
        console.warn("Could not determine camera count:", deviceErr);
      }
      
      // Use facingMode in constraints if supported
      const videoConstraints: MediaTrackConstraints = {};
      
      // Only set facingMode if running on mobile (likely to have front/back cameras)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile || hasFrontAndBack) {
        videoConstraints.facingMode = { exact: facingMode };
      }
      
      // Try with exact facingMode first
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch (exactErr) {
        console.log("Simple camera: couldn't use exact facingMode, falling back to default", exactErr);
        
        // Fall back to basic constraints
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      
      // Store in state
      setStream(videoStream);
      
      // Connect to video element
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        console.log("Simple camera: stream connected to video element");
      }
    } catch (err) {
      console.error("Simple camera error:", err);
      setError("Could not access camera. Please check permissions and try again.");
      
      // Clean up any partial stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, hasFrontAndBack, isInitializing, stream]);
  
  // Initialize once on mount
  useEffect(() => {
    let mounted = true;
    
    // Start camera with a slight delay to ensure DOM is ready
    const timerId = setTimeout(() => {
      if (mounted) {
        startCamera();
      }
    }, 800);
    
    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timerId);
      
      // Stop any active tracks
      if (stream) {
        console.log("Simple camera: stopping tracks on unmount");
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);
  
  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleCanPlay = () => {
      console.log("Simple camera: video can play now");
      setIsReady(true);
    };
    
    const handleError = () => {
      console.error("Simple camera: video element error");
      setError("Video playback error. Please try again.");
    };
    
    // Register event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    
    return () => {
      // Cleanup listeners
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);
  
  // Capture image
  const captureImage = () => {
    if (!videoRef.current || !isReady) return;
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
      }
    } catch (err) {
      console.error("Simple camera: capture error", err);
      setError("Failed to capture image");
    }
  };
  
  // Toggle camera facing mode (front/back)
  const toggleFacingMode = useCallback(() => {
    // Toggle between user (front) and environment (back) facing modes
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log(`Simple camera: switching from ${facingMode} to ${newFacingMode}`);
    
    setFacingMode(newFacingMode);
    
    // Re-initialize camera with new facing mode
    setTimeout(() => {
      startCamera();
    }, 300);
  }, [facingMode, startCamera]);
  
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gray-900", className)}>
      {error ? (
        <div className="flex flex-col items-center justify-center h-64 p-4 text-white text-center">
          <p className="mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <p className="text-white">Starting camera...</p>
            </div>
          )}
          
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <Button
              onClick={captureImage}
              disabled={!isReady}
              className="bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gray-100 p-0"
            >
              <div className="bg-blue-500 rounded-full w-12 h-12"></div>
            </Button>
            
            {/* Camera flip button */}
            {withFacingToggle && (hasFrontAndBack || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) && (
              <Button 
                onClick={toggleFacingMode}
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-4 rounded-full bg-gray-800 text-white"
                disabled={!isReady || isInitializing}
              >
                <span className="material-icons text-sm">
                  flip_camera_{facingMode === 'user' ? 'android' : 'ios'}
                </span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}