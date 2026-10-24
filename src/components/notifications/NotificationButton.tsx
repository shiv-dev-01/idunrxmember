import React, { useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '../../hooks/useNotifications';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

export function NotificationButton() {
  const {
    unreadCount,
    isOpen,
    setIsOpen,
  } = useNotifications();
  
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <NotificationPanel />
        </div>
      )}
    </div>
  );
}