import { 
  LayoutDashboard, 
  ShoppingCart, 
  User, 
  Video,
  Lock,
  MessageSquare,
  HeartPulse,
  Pill,
} from 'lucide-react';
import type { NavItem } from '../types';
import { storage } from '../utils/storage';
const ProductCategory = storage.getProductCategory();


export const navItems: NavItem[] = [
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    href: '/dashboard' 
  },
  { 
    icon: ShoppingCart, 
    label: 'Orders', 
    href: '/orders' 
  },
  {
    icon: Pill,
    label: 'Refill Medication',
    href: '/refills',
  },
  { 
    icon: User, 
    label: 'Account Details', 
    href: '/account' 
  },
  // ...(ProductCategory === "Weight Loss" ? [
    { 
      icon: Video, 
      label: 'Instruction Videos', 
      href: '/videos' 
    },
  // ] : []),
  {
    icon: HeartPulse,
    label: 'Health Coaching',
    href: '/coaching',
  },
  { 
    icon: MessageSquare, 
    label: 'Talk to My Doctor', 
    href: '/chat' 
  },
  { 
    icon: Lock, 
    label: 'Update Password', 
    href: '/password' 
  }
];