import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useUser } from '../../hooks/useUser';
import type { NavItem } from '../../types';

interface MobileNavProps {
  isOpen: boolean;
  onToggle: () => void;
  navItems: NavItem[];
  onLogout: () => void | Promise<void>;
}

export function MobileNav({ isOpen, onToggle, navItems, onLogout }: MobileNavProps) {
  const location = useLocation();
  const user = useUser();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-40 md:hidden">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end p-4 border-b">
          <Button
            variant="secondary"
            onClick={onToggle}
            className="p-2"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* User Profile */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <div className="bg-primary-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-medium text-primary-700">
                  {user.initials}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                    location.pathname === item.href ? 'bg-primary-50 text-primary-600' : ''
                  }`}
                  onClick={onToggle}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={() => {
                  onToggle();
                  onLogout();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}