import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SimpleWebcamProps {
  onCapture: (imageData: string) => void;
  className?: string;
}

export function SimpleWebcam({ onCapture, className }: SimpleWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize once on mount
  useEffect(() => {
    let mounted = true;
    let videoStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        console.log("Simple camera: starting initialization");

        // Request camera access with minimal constraints and try to enable flash
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            advanced: [{ torch: true }]
          },
          audio: false,
        });

        // Store in local variable
        videoStream = cameraStream;

        // If component was unmounted during async operation, cleanup and exit
        if (!mounted) {
          console.log("Simple camera: component unmounted during initialization");
          if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
          }
          return;
        }

        // Store in state
        setStream(videoStream);

        // Connect to video element
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
          console.log("Simple camera: stream connected to video element");
        }

        // Try to enable flash/torch if available
        const track = videoStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
        }


      } catch (err) {
        console.error("Simple camera error:", err);
        if (mounted) {
          setError("Could not access camera. Please check permissions and try again.");
        }
      }
    };

    // Start camera with a slight delay to ensure DOM is ready
    const timerId = setTimeout(startCamera, 800);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timerId);

      // Stop any active tracks
      if (videoStream) {
        console.log("Simple camera: stopping tracks on unmount");
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
          </div>
        </>
      )}
    </div>
  );
}