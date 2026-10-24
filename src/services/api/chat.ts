import axios from "axios";
import type { ChatMessage } from "../../types/chat";
import { api } from "./config";
import { storage } from "../../utils/storage";

export type GetTokensResponse = {
  status: number;
  message?: string;
  data: string;
  patientId?: string;
};

function requireChatContext(email?: string | null) {
  const userEmail = email ?? storage.getUserData()?.email;
  const patientId = storage.getPatientId();
  const token = storage.getAuthToken();

  if (!userEmail) {
    throw new Error("User email not found");
  }
  if (!patientId) {
    throw new Error("Patient ID not found");
  }
  if (!token) {
    throw new Error("Chat token not found. Initialize chat first.");
  }

  return { email: userEmail, patientId, token };
}

function mapMessages(data: unknown): ChatMessage[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown })?.data)
      ? ((data as { data: unknown[] }).data)
      : [];

  return list.map((msg: any) => ({
    id: String(msg.id ?? `${msg.created_at}-${msg.text ?? ""}`),
    content: msg.text ?? null,
    sender:
      typeof msg.user_type === "string" && msg.user_type.includes("Patient")
        ? "user"
        : "doctor",
    timestamp: msg.created_at,
    files: msg.files,
  }));
}

/** Call /get_tokens — store response.data as chat token and patientId */
export const generateChatToken = async (
  email: string,
  category: string
): Promise<GetTokensResponse> => {
  try {
    const response = await api.post("/get_tokens", {
      email,
      is_cat: category,
    });

    if (response.data.status === 1 && response.data.data) {
      return response.data;
    }
    throw new Error("Failed to generate chat token");
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/** @deprecated No longer configures MD Integrations client — kept for import compatibility */
export const configureChatApi = (_token: string) => {
  // Panel session cookie + body token handle auth now
};

/** POST /patient_message — fetch chat history via panel API */
export const getChatMessages = async (): Promise<ChatMessage[]> => {
  try {
    const { email, patientId, token } = requireChatContext();

    const response = await api.post("/patient_message", {
      patient_id: patientId,
      channel: "patient",
      token,
      email,
    });

    const payload = response.data?.data ?? response.data;
    return mapMessages(payload);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/** POST /send_patient_message — text only (JSON) */
export const sendChatMessage = async (text: string): Promise<unknown> => {
  try {
    const { email, patientId, token } = requireChatContext();

    const response = await api.post("/send_patient_message", {
      patient_id: patientId,
      channel: "patient",
      token,
      email,
      text,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/**
 * POST /send_patient_message — file only (FormData)
 * Do not send text with file.
 */
export const uploadFile = async (file: File): Promise<unknown> => {
  try {
    const { email, patientId, token } = requireChatContext();

    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("channel", "patient");
    formData.append("token", token);
    formData.append("email", email);
    formData.append("file", file);

    const response = await api.post("/send_patient_message", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

/**
 * @deprecated File send is now a single FormData call via uploadFile.
 * Kept so existing imports don't break.
 */
export const sendFileMessage = async (_fileId: string): Promise<unknown> => {
  return { status: 1, message: "Use uploadFile for panel send_patient_message" };
};
