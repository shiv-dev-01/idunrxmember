import { useState, useEffect } from "react";
import {
  sendChatMessage,
  getChatMessages,
  uploadFile,
  generateChatToken,
} from "../services/api";
import type { Message } from "../types";
import { storage } from "../utils/storage";

interface UseChatProps {
  productCategory?: string;
}

export function useChat({ productCategory }: UseChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeChat = async () => {
      if (!productCategory) return;

      const userData = storage.getUserData();
      if (!userData?.email) {
        setError("User email not found");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setIsReady(false);

        const tokenResponse = await generateChatToken(
          userData.email,
          productCategory
        );

        storage.setAuthToken(tokenResponse.data);
        if (tokenResponse.patientId) {
          storage.setPatientId(tokenResponse.patientId);
        }

        setIsReady(true);
        await fetchMessages();
      } catch (err: unknown) {
        console.error("Failed to initialize chat:", err);
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to initialize chat";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [productCategory]);

  const fetchMessages = async () => {
    try {
      const chatMessages = await getChatMessages();
      setMessages(
        chatMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp,
          files: msg.files,
        }))
      );
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch messages:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to load messages";
      setError(message);
    }
  };

  const sendMessage = async (message: { type: "text"; content: string }) => {
    if (!isReady && !storage.getAuthToken()) {
      setError("Chat not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userMessage: Message = {
        id: Date.now().toString(),
        content: message.content,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      await sendChatMessage(message.content);
      await fetchMessages();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to send message";
      setError(message);
      console.error("Failed to send message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!isReady && !storage.getAuthToken()) {
      setError("Chat not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Single FormData call — no separate upload + file message
      await uploadFile(file);
      await fetchMessages();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to upload file";
      setError(message);
      console.error("Failed to upload file:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    handleFileUpload,
    isLoading,
    error,
  };
}
