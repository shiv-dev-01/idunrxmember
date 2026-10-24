import React, { useState, useRef } from "react";
import {
  Send,
  Paperclip,
  X,
  Loader,
  Video,
  Camera,
  FileText,
  Mic,
} from "lucide-react";
import { Button } from "../ui/Button";
import { VideoRecorder } from "./VideoRecorder";
import { AudioRecorder } from "./AudioRecorder";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  onSendMessage: (e: React.FormEvent) => void;
  onFileUpload: (file: File) => Promise<void>;
  onFocus?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  textAreaRef,
  onSendMessage,
  onFileUpload,
  onFocus,
  isLoading,
  placeholder = "Type your message...",
}: MessageInputProps) {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: "image" | "document" | "video" | "audio") => {
    if (type === "image" && imageInputRef.current) {
      imageInputRef.current.click();
    } else if (type === "document" && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (type === "video") {
      setShowVideoRecorder(true);
    } else if (type === "audio") {
      setShowAudioRecorder(true);
    }
    setShowAttachMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await onFileUpload(file);
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setIsUploading(false);
    }

    // Reset input
    e.target.value = "";
  };

  const handleVideoRecorded = async (videoBlob: Blob) => {
    try {
      setIsUploading(true);
      const file = new File([videoBlob], "recorded-video.webm", {
        type: "video/webm",
      });
      await onFileUpload(file);
    } catch (error) {
      console.error("Failed to upload video:", error);
    } finally {
      setIsUploading(false);
      setShowVideoRecorder(false);
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      const file = new File([audioBlob], "voice-message.webm", {
        type: "audio/webm",
      });
      await onFileUpload(file);
    } catch (error) {
      console.error("Failed to upload audio:", error);
    } finally {
      setIsUploading(false);
      setShowAudioRecorder(false);
    }
  };

  const isDisabled = isLoading || isUploading;

  if (showAudioRecorder) {
    return (
      <AudioRecorder
        onRecordingComplete={handleAudioRecorded}
        onCancel={() => setShowAudioRecorder(false)}
        isUploading={isUploading}
      />
    );
  }

  return (
    <div className="relative">
      <form onSubmit={onSendMessage} className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="p-2 relative"
          title="Attach file"
          disabled={isDisabled}
        >
          {isUploading ? (
            <Loader className="w-5 h-5 text-primary-500 animate-spin" />
          ) : showAttachMenu ? (
            <X className="w-5 h-5 text-gray-500" />
          ) : (
            <Paperclip className="w-5 h-5 text-gray-500" />
          )}
        </Button>

        <div className="flex flex-1">
          <textarea
            ref={textAreaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={onFocus}
            placeholder={isUploading ? "Uploading file..." : placeholder}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 resize-none focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm max-h-[120px]"
            rows={1}
            disabled={isDisabled}
            style={{ minHeight: "40px" }}
          />
        </div>

        <Button
          type="submit"
          disabled={!newMessage.trim() || isDisabled}
          className="p-2"
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>

      {/* Attachment Menu */}
      {showAttachMenu && !isUploading && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]">
          <button
            onClick={() => handleFileSelect("image")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full">
              <Camera className="w-5 h-5 text-green-600" />
            </span>
            Photos
          </button>
          <button
            onClick={() => handleFileSelect("video")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-red-100 rounded-full">
              <Video className="w-5 h-5 text-red-600" />
            </span>
            Record Video
          </button>
          <button
            onClick={() => handleFileSelect("audio")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full">
              <Mic className="w-5 h-5 text-purple-600" />
            </span>
            Voice Message
          </button>
          <button
            onClick={() => handleFileSelect("document")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full">
              <FileText className="w-5 h-5 text-blue-600" />
            </span>
            Document
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* Video Recorder Modal */}
      {showVideoRecorder && (
        <VideoRecorder
          onClose={() => setShowVideoRecorder(false)}
          onVideoRecorded={handleVideoRecorded}
        />
      )}
    </div>
  );
}
