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
  const [isMounted, setIsMounted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  
  // Show debug info to help troubleshoot
  const [debugInfo, setDebugInfo] = useState<{
    hasUserMedia: boolean;
    videoElementExists: boolean;
    readyState: number | null;
    videoWidth: number | null;
    videoHeight: number | null;
    initAttempts: number;
  }>({
    hasUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    videoElementExists: false,
    readyState: null,
    videoWidth: null,
    videoHeight: null,
    initAttempts: 0
  });
  
  // Update debug info
  const updateDebugInfo = useCallback(() => {
    if (!videoRef.current) {
      setDebugInfo(prev => ({
        ...prev,
        videoElementExists: false
      }));
      return;
    }
    
    setDebugInfo(prev => ({
      ...prev,
      videoElementExists: true,
      readyState: videoRef.current?.readyState || null,
      videoWidth: videoRef.current?.videoWidth || null,
      videoHeight: videoRef.current?.videoHeight || null
    }));
  }, []);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Camera initialization function - simplified version
  const initCamera = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (isInitializing || !isMounted) return;
    
    setIsInitializing(true);
    setDebugInfo(prev => ({ 
      ...prev, 
      initAttempts: prev.initAttempts + 1 
    }));
    
    console.log("🔄 Starting camera initialization (attempt " + (debugInfo.initAttempts + 1) + ")");
    
    try {
      // Clean up previous stream
      if (streamRef.current) {
        console.log("🛑 Stopping previous stream tracks");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setCameraReady(false);
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser");
      }
      
      // Extremely basic constraints for maximum compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      console.log("✅ Stream obtained:", stream.id, "with", stream.getVideoTracks().length, "video tracks");
      
      // Store stream reference
      streamRef.current = stream;
      
      if (videoRef.current) {
        // Set srcObject to null first to reset any previous state
        videoRef.current.srcObject = null;
        
        // Small delay before setting new stream
        await new Promise(r => setTimeout(r, 100));
        
        // Attach stream to video element
        videoRef.current.srcObject = stream;
        console.log("🎥 Stream attached to video element");
        
        updateDebugInfo();
        
        // Play the video with manual handling
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("▶️ Video playback started successfully");
              setCameraReady(true);
              updateDebugInfo();
            })
            .catch(error => {
              console.error("❌ Video playback failed:", error);
              // Try one more time with user interaction
              setError("Camera initialization failed. Please try again.");
            });
        }
      } else {
        console.error("❌ Video element not found");
        setError("Camera element not found. Please reload the page.");
      }
    } catch (err) {
      console.error('❌ Camera access error:', err);
      setError('Could not access camera. Please check permissions and try again.');
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } finally {
      updateDebugInfo();
      setIsInitializing(false);
    }
  }, [isMounted, isInitializing, debugInfo.initAttempts, updateDebugInfo]);

  // Initialize camera on component mount - with initialization flag to prevent multiple calls
  useEffect(() => {
    if (!isMounted) return;
    
    // Flag to prevent multiple initialization attempts
    let hasInitialized = false;
    
    const timer = setTimeout(() => {
      if (!hasInitialized) {
        hasInitialized = true;
        console.log("🚀 Initial camera initialization");
        initCamera();
      }
    }, 1000); // Longer delay for DOM to be completely ready
    
    return () => {
      clearTimeout(timer);
      console.log("🧹 Cleaning up camera resources");
      
      // Stop stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
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
      setError("Failed to capture image. Please try again.");
    }
  }, [onCapture, cameraReady]);

  // Toggle camera visibility
  const toggleCamera = useCallback(() => {
    if (showCamera) {
      // Stop camera when hiding
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
    } else {
      setShowCamera(true);
      // Re-initialize camera when showing
      initCamera();
    }
  }, [showCamera, initCamera]);

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
            
            <div className="mt-4 text-xs text-left p-2 bg-black/50 rounded">
              <p className="font-bold mb-1">Debug Info:</p>
              <p>Has getUserMedia: {debugInfo.hasUserMedia ? 'Yes' : 'No'}</p>
              <p>Video element: {debugInfo.videoElementExists ? 'Yes' : 'No'}</p>
              <p>Ready state: {debugInfo.readyState !== null ? debugInfo.readyState : 'N/A'}</p>
              <p>Resolution: {debugInfo.videoWidth || 0} x {debugInfo.videoHeight || 0}</p>
              <p>Init attempts: {debugInfo.initAttempts}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 w-full" style={{ aspectRatio: aspectRatio || 4/3 }}>
            {showCamera ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                <p>Camera is disabled</p>
              </div>
            )}
            
            {showCamera && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                <div className="flex flex-col items-center">
                  <span className="material-icons animate-spin mb-2">sync</span>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
            {showCamera && (
              <Button 
                onClick={captureImage}
                disabled={!cameraReady}
                className="bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gray-100 p-0"
              >
                <div className="bg-primary rounded-full w-12 h-12"></div>
              </Button>
            )}
            
            <Button 
              onClick={toggleCamera}
              variant="secondary"
              size="sm"
              className="absolute bottom-0 left-4 rounded-full"
            >
              <span className="material-icons">
                {showCamera ? 'videocam_off' : 'videocam'}
              </span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
