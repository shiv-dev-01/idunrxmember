
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, Trash2, RotateCcw, Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import type { MediaType } from '../../types';

interface MediaModalProps {
  type: MediaType;
  onCapture: (mediaUrl: string, type: MediaType) => void;
  onClose: () => void;
}

export function MediaModal({ type, onCapture, onClose }: MediaModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { hasCamera, hasMicrophone, error } = useMediaDevices();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initializeMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: type === 'video',
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    initializeMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [type]);

  const handlePhotoCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            onCapture(url, 'photo');
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleStartRecording = () => {
    if (!videoRef.current?.srcObject) return;

    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          startRecording();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDeleteRecording = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSendRecording = () => {
    if (previewUrl) {
      onCapture(previewUrl, 'video');
    }
  };

  if (error) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Device Error"
      >
        <div className="p-4 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </Modal>
    );
  }

  if (!hasCamera || (type === 'video' && !hasMicrophone)) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Device Not Available"
      >
        <div className="p-4 text-center">
          <p className="text-gray-600">
            {!hasCamera 
              ? "Camera not found. Please connect a camera and try again."
              : "Microphone not found. Please connect a microphone for video recording."}
          </p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={type === 'photo' ? '📸 Take a Photo' : '🎥 Record Video'}
    >
      <div className="space-y-6">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
   
          />
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          {type === 'photo' ? (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handlePhotoCapture}>
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            </div>
          ) : previewUrl ? (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={handleDeleteRecording}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="secondary" onClick={handleStartRecording}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Record Again
              </Button>
              <Button variant="secondary" onClick={onClose} className="col-span-2">
                Cancel
              </Button>
              <Button onClick={handleSendRecording} className="col-span-2">
                <Send className="w-4 h-4 mr-2" />
                Send Video
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={countdown !== null}
              >
                {countdown !== null
                  ? `Starting in ${countdown}...`
                  : isRecording
                  ? 'Stop Recording'
                  : 'Start Recording'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
