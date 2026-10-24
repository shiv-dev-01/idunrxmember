import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md sm:max-w-lg transform rounded-xl sm:rounded-2xl bg-white shadow-2xl transition-all">
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="px-4 sm:px-6 py-4 sm:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
