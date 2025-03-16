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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasFrontAndBack, setHasFrontAndBack] = useState(false);
  
  // Show debug info to help troubleshoot
  const [debugInfo, setDebugInfo] = useState<{
    hasUserMedia: boolean;
    videoElementExists: boolean;
    readyState: number | null;
    videoWidth: number | null;
    videoHeight: number | null;
    initAttempts: number;
    facingMode: string;
  }>({
    hasUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    videoElementExists: false,
    readyState: null,
    videoWidth: null,
    videoHeight: null,
    initAttempts: 0,
    facingMode: facingMode
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
      videoHeight: videoRef.current?.videoHeight || null,
      facingMode: facingMode
    }));
  }, [facingMode]);

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
    
    console.log(`🔄 Starting camera initialization (attempt ${debugInfo.initAttempts + 1}, facingMode: ${facingMode})`);
    
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

      // First check if there are multiple cameras available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const hasMultipleCameras = videoDevices.length > 1;
        setHasFrontAndBack(hasMultipleCameras);
        console.log(`📷 Detected ${videoDevices.length} cameras`);
      } catch (deviceErr) {
        console.warn("Could not determine camera count:", deviceErr);
        // Continue anyway, we'll try with basic constraints
      }
      
      // Use facingMode in constraints if supported
      const videoConstraints: MediaTrackConstraints = {};
      
      // Only set facingMode if running on mobile (likely to have front/back cameras)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile || hasFrontAndBack) {
        videoConstraints.facingMode = { exact: facingMode };
      }
      
      let stream;
      try {
        // Try with exact facingMode first (strict constraints)
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      } catch (exactError) {
        console.log("Could not get stream with exact facingMode, trying with basic constraints", exactError);
        
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
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
  }, [isMounted, isInitializing, debugInfo.initAttempts, updateDebugInfo, facingMode, hasFrontAndBack]);

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
  
  // Toggle camera facing mode (front/back)
  const toggleFacingMode = useCallback(() => {
    // Toggle between user (front) and environment (back) facing modes
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log(`Switching camera from ${facingMode} to ${newFacingMode}`);
    
    setFacingMode(newFacingMode);
    
    // Re-initialize camera with new facing mode
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Small delay before reinitializing to ensure previous stream is fully stopped
    setTimeout(() => {
      initCamera();
    }, 300);
  }, [facingMode, initCamera]);

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
              <p>Facing mode: {debugInfo.facingMode}</p>
              <p>Multiple cameras: {hasFrontAndBack ? 'Yes' : 'No'}</p>
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
            
            {/* Add camera flip button if withFacingToggle is true and we have multiple cameras */}
            {withFacingToggle && showCamera && (hasFrontAndBack || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) && (
              <Button 
                onClick={toggleFacingMode}
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-4 rounded-full"
                disabled={!cameraReady || isInitializing}
              >
                <span className="material-icons">
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
