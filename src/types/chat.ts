export interface ChatFile {
  id: string;
  name: string;
  type: string;
  mime_type: string;
  url: string;
  url_thumbnail: string;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  sender: 'user' | 'doctor';
  timestamp: string;
  files?: ChatFile[];
}

export interface ChatResponse {
  data: Array<{
    id: string;
    text: string | null;
    user_type: string;
    created_at: string;
    files?: ChatFile[];
  }>;
}