import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Loader,
  Play,
  Pause,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Button } from "../ui/Button";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  onCancel,
  isUploading,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      cleanup();
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", () =>
          setIsPlaying(false)
        );
      }
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
  };

  const startRecording = async () => {
    try {
      cleanup();
      setError(null);
      setRecordedBlob(null);
      setDuration(0);
      setIsPlaying(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);

        if (audioRef.current) {
          const url = URL.createObjectURL(blob);
          audioRef.current.src = url;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setError(
        "Unable to start recording. Please check your microphone permissions."
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Playback error:", err);
          setError("Failed to play recording");
        });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSend = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  };

  const handleClose = () => {
    cleanup();
    onCancel();
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
      {/* Close Button */}
      <Button
        variant="secondary"
        onClick={handleClose}
        className="absolute top-1 right-4 p-1.5 hover:bg-gray-200"
        title="Close"
      >
        <X className="w-4 h-4" />
      </Button>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        {isUploading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Sending audio message...</span>
          </div>
        ) : recordedBlob ? (
          <>
            <Button
              onClick={togglePlayback}
              variant="secondary"
              className="p-3"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            <div className="flex-1">
              <div className="text-sm font-medium">
                Voice Message ({formatTime(duration)})
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={startRecording}
              className="p-2"
              title="Record Again"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button onClick={handleSend} className="p-2">
              <Send className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 ${
                isRecording ? "bg-red-500 hover:bg-red-600" : ""
              }`}
              disabled={!!error}
            >
              {isRecording ? (
                <Square className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>

            <div className="flex-1">
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <span className="animate-pulse text-red-500">●</span>
                  <span className="text-sm font-medium">
                    Recording {formatTime(duration)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  Click to start recording
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
