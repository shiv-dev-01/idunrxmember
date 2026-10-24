import React, { useRef, useState, useEffect } from 'react';
import { Video, StopCircle, Loader, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface VideoRecorderProps {
  onClose: () => void;
  onVideoRecorded: (blob: Blob) => void;
}

export function VideoRecorder({ onClose, onVideoRecorded }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Unable to access camera or microphone');
      }
    };

    initializeCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordedBlob) {
        URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
      }
    };
  }, []);

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          beginRecording();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const beginRecording = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (previewVideoRef.current) {
        const url = URL.createObjectURL(blob);
        previewVideoRef.current.src = url;
        previewVideoRef.current.load();
      }
    };

    mediaRecorder.start();
    setIsRecording(true);

    // Automatically stop recording after 1 minute
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        stopRecording();
      }
    }, 60000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (recordedBlob) {
      try {
        setIsSending(true);
        await onVideoRecorded(recordedBlob);
        onClose();
      } catch (error) {
        console.error('Failed to send video:', error);
        setError('Failed to send video. Please try again.');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleRetry = async () => {
    setRecordedBlob(null);
    if (previewVideoRef.current) {
      previewVideoRef.current.src = '';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera or microphone');
    }

    chunksRef.current = [];
    setIsRecording(false);
  };

  if (error) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Camera Error">
        <div className="p-4 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isRecording ? "Recording..." : "Record Video"}
    >
      <div className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <span className="text-6xl font-bold text-white">{countdown}</span>
            </div>
          )}
          
          {recordedBlob ? (
            <video
              ref={previewVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              controls
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isRecording && !countdown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <p className="text-white text-center px-4">
                    Click 'Start Recording' to begin. Your video will be limited to 1 minute.
                  </p>
                </div>
              )}
            </>
          )}

          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Recording
            </div>
          )}

          {isSending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-white">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Sending video...</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          {recordedBlob ? (
            <>
              <Button 
                variant="secondary" 
                onClick={handleRetry}
                disabled={isSending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Record Again
              </Button>
              <Button 
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Video'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="secondary" 
                onClick={onClose}
                disabled={isRecording || countdown !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={countdown !== null}
              >
                {countdown !== null ? (
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                ) : isRecording ? (
                  <>
                    <StopCircle className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}