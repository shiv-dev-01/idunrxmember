import React, { useState } from 'react';
import { MessageCircle, Stethoscope, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAutoResizeTextArea } from '../../hooks/useAutoResizeTextArea';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '../ui/Button';

interface ChatBoxProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  productCategory?: string;
}

export function ChatBox({ 
  title = "Talk to Doctor",
  subtitle,
  placeholder = "Send message to doctor...",
  productCategory
}: ChatBoxProps) {
  const { messages, sendMessage, handleFileUpload, isLoading } = useChat({ productCategory });
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textAreaRef = useAutoResizeTextArea();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isLoading) {
      await sendMessage({ type: 'text', content: newMessage });
      setNewMessage('');
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`
      card flex flex-col transition-all duration-300 relative
      ${isExpanded ? 'fixed inset-4 z-50 m-0 rounded-xl' : 'h-[600px]'}
    `}>
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-white sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Available 24/7</p>
              {/* {productCategory && (
                <>
                  <span className="text-gray-300">•</span>
                  <p className="text-sm text-primary-500 font-medium">{productCategory}</p>
                </>
              )} */}
            </div>
          </div>
        </div>
        {/* <Button
          variant="secondary"
          onClick={toggleExpand}
          className="p-2"
          title={isExpanded ?  "Maximize" :  "Minimize" }
        >
          {isExpanded ? (
            <Maximize2 className="w-5 h-5" />
          ) : (
          <Minimize2 className="w-5 h-5" />
          )}
        </Button> */}
      </div>
      
      <div className="flex-1 overflow-hidden bg-gray-50">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className="p-4 border-t bg-white sticky bottom-0">
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          textAreaRef={textAreaRef}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          isLoading={isLoading}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}