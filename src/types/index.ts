import { LucideIcon } from 'lucide-react';
import type { ChatFile } from './chat';

export interface Message {
  id: string;
  content: string | null;
  sender: 'user' | 'doctor';
  timestamp: string;
  files?: ChatFile[];
}

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface User {
  name: string;
  email: string;
}

export interface Subscription {
  productName: string;
  dosage: string;
  orderDate: string;
  price: string;
  nextBillingDate: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered';
  trackingNumber?: string;
  carrier?: string;
  productName?: string;
  dosage?: string;
  price?: string;
  productImage?: string;
  nextBillingDate?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
}

export interface AccountDetails {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  shippingAddress: Address;
  billingAddress: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  url: string;
}

export type SearchCategory = 'orders' | 'videos' | 'account' | 'docs';

export type NotificationType = 'order' | 'medical' | 'billing';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}