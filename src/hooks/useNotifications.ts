import { useState, useCallback } from 'react';
import type { Notification } from '../types';

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'Order Shipped',
    message: 'Your order #ORD-002 has been shipped via UPS',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isRead: false,
  },
  {
    id: '2',
    type: 'medical',
    title: 'New Message from Doctor',
    message: 'Dr. Smith has sent you a new message regarding your treatment',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    isRead: false,
  },
  {
    id: '3',
    type: 'billing',
    title: 'Upcoming Payment',
    message: 'Your next billing cycle starts in 3 days',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
  },
  {
    id: '4',
    type: 'order',
    title: 'Order Delivered',
    message: 'Your order #ORD-001 has been delivered',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    isRead: true,
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
}