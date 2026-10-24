import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Loader, FileText, Play, Pause } from "lucide-react";
import { Modal } from "../ui/Modal";
import type { Message } from "../../types";
import type { ChatFile } from "../../types/chat";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<ChatFile | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [shouldScroll, setShouldScroll] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const prevMessagesLength = useRef(messages.length);

  const scrollToBottom = () => {
    if (shouldScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  useEffect(() => {
    // Only auto-scroll if new messages are added
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledNearBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    setShouldScroll(isScrolledNearBottom);
  };

  const handleFileLoad = (fileId: string) => {
    setLoadingFiles((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  };

  const handleFileLoadStart = (fileId: string) => {
    setLoadingFiles((prev) => new Set(prev).add(fileId));
  };

  const handleAudioPlayPause = (fileId: string) => {
    const audio = audioRefs.current[fileId];
    if (!audio) return;

    if (playingAudio === fileId) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
      }
      audio.play();
      setPlayingAudio(fileId);
    }
  };

  const handleAudioEnded = (fileId: string) => {
    setPlayingAudio(null);
  };

  const renderFilePreview = (file: ChatFile) => {
    const isImage = file.mime_type.startsWith("image/");
    const isVideo = file.mime_type.startsWith("video/");
    const isAudio = file.mime_type.startsWith("audio/");
    const isLoading = loadingFiles.has(file.id);

    if (isAudio) {
      return (
        <div
          key={file.id}
          className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
        >
          <button
            onClick={() => handleAudioPlayPause(file.id)}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors"
          >
            {playingAudio === file.id ? (
              <Pause className="w-5 h-5 text-primary-500" />
            ) : (
              <Play className="w-5 h-5 text-primary-500" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Voice Message</p>
            <audio
              ref={(el) => {
                if (el) audioRefs.current[file.id] = el;
              }}
              src={file.url}
              onEnded={() => handleAudioEnded(file.id)}
              className="hidden"
            />
          </div>
        </div>
      );
    }

    return (
      <div
        key={file.id}
        className="cursor-pointer hover:opacity-90 transition-opacity relative"
        onClick={() => setSelectedFile(file)}
      >
        {isImage ? (
          <div className="relative">
            <img
              src={file.url_thumbnail || file.url}
              alt={file.name}
              className="max-w-[200px] rounded-lg"
              onLoadStart={() => handleFileLoadStart(file.id)}
              onLoad={() => handleFileLoad(file.id)}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
                <Loader className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            )}
          </div>
        ) : isVideo ? (
          <div className="relative max-w-[200px]">
            <video
              src={file.url}
              className="w-full rounded-lg"
              controls
              preload="metadata"
              onLoadStart={() => handleFileLoadStart(file.id)}
              onLoadedData={() => handleFileLoad(file.id)}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
                <Loader className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium truncate max-w-[150px]">
              {file.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === "user";
    const hasFiles = message.files && message.files.length > 0;

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`
          max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2
          ${isUser ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-900"}
        `}
        >
          {message.content && (
            // <p className="break-words mb-2">{message.content}</p>
            <p className="break-words mb-2">{linkify(message.content)}</p>
          )}

          {hasFiles && (
            <div className="space-y-2 mt-2">
              {message.files!.map(renderFilePreview)}
            </div>
          )}

          <div
            className={`text-xs mt-1 ${
              isUser ? "text-primary-100" : "text-gray-500"
            }`}
          >
            {format(new Date(message.timestamp), "HH:mm")}
          </div>
        </div>
      </div>
    );
  };

  function linkify(text: string) {
    const elements: React.ReactNode[] = [];
    const regex =
      /((https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/g;

    let lastIndex = 0;
    let match;
    let matchIndex = 0;

    const matches = Array.from(text.matchAll(regex));

    matches.forEach((match, index) => {
      const matchedText = match[0];
      const start = match.index ?? 0;

      // Push plain text before the link/email
      if (start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.slice(lastIndex, start)}</span>
        );
      }

      // Determine if it's a URL or email
      const isEmail =
        matchedText.includes("@") && !matchedText.startsWith("http");
      const href = isEmail ? `mailto:${matchedText}` : matchedText;

      // Push link
      elements.push(
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline break-words"
        >
          {matchedText}
        </a>
      );

      lastIndex = start + matchedText.length;
    });

    // Push any remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return elements;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1" />
      <div
        className="overflow-y-auto px-2 max-h-[600px]"
        onScroll={handleScroll}
      >
        {/* {isLoading && (
          <div className="flex justify-center items-center py-4">
            <Loader className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        )} */}

        {/* {[...messages].reverse().map(renderMessage)} */}

        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center py-4 text-gray-500 h-40 md:h-80">
            No messages yet. Your doctor will update you here soon. Stay tuned!
          </div>
        ) : (
          [...messages].reverse().map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview Modal */}
      <Modal
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        title={selectedFile?.name || ""}
      >
        <div className="flex justify-center">
          {selectedFile?.mime_type.startsWith("image/") ? (
            <img
              src={selectedFile.url}
              alt={selectedFile.name}
              className="max-w-full rounded-lg"
            />
          ) : selectedFile?.mime_type.startsWith("video/") ? (
            <video
              src={selectedFile.url}
              className="max-w-full rounded-lg"
              controls
              autoPlay
            />
          ) : selectedFile?.mime_type.startsWith("audio/") ? (
            <audio
              src={selectedFile.url}
              className="w-full"
              controls
              autoPlay
            />
          ) : (
            <iframe
              src={selectedFile?.url}
              className="w-full h-[600px] rounded-lg"
              title={selectedFile?.name}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
