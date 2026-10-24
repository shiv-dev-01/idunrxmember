import { useEffect, useRef } from 'react';

export function useAutoResizeTextArea() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    const adjustHeight = () => {
      textArea.style.height = 'auto';
      textArea.style.height = `${textArea.scrollHeight}px`;
    };

    textArea.addEventListener('input', adjustHeight);
    adjustHeight();

    return () => {
      textArea.removeEventListener('input', adjustHeight);
    };
  }, []);

  return textAreaRef;
}