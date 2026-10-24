import React from 'react';
import { format } from 'date-fns';
import { Bell, Package, MessageSquare, CreditCard, X, Check, BellOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../types';

const NOTIFICATION_ICONS = {
  order: Package,
  medical: MessageSquare,
  billing: CreditCard,
};

export function NotificationPanel() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  const renderNotification = (notification: Notification) => {
    const Icon = NOTIFICATION_ICONS[notification.type];
    
    return (
      <div
        key={notification.id}
        className={`
          relative p-4 hover:bg-gray-50 transition-colors
          ${!notification.isRead ? 'bg-primary-50' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg
            ${notification.type === 'medical' ? 'bg-blue-50 text-blue-600' :
              notification.type === 'billing' ? 'bg-purple-50 text-purple-600' :
              'bg-primary-50 text-primary-600'}
          `}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
            </p>
          </div>

          <div className="flex items-start gap-1">
            {!notification.isRead && (
              <Button
                variant="secondary"
                onClick={() => markAsRead(notification.id)}
                className="p-1"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => clearNotification(notification.id)}
              className="p-1"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (notifications.length === 0) {
    return (
      <div className="w-[380px] p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 mb-4">
            <BellOff className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-2">All Caught Up!</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] max-h-[600px] overflow-hidden flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <Button
          variant="secondary"
          onClick={markAllAsRead}
          size="sm"
          className="text-sm"
        >
          Mark all as read
        </Button>
      </div>
      
      <div className="overflow-y-auto divide-y">
        {notifications.map(renderNotification)}
      </div>
    </div>
  );
}