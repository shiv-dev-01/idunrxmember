import React, { useState, useRef } from 'react';
import { Menu, LogOut, Bell, Search } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '../ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useUser } from '../../hooks/useUser';
import { useAuth } from '../../hooks/useAuth';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { SearchBox } from '../search/SearchBox';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const isMobile = useIsMobile();
  const user = useUser();
  const { logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  return (
    <header className="bg-white border-b px-4 py-3 md:py-4 fixed top-0 left-0 right-0 z-30">
      <div className="max-w-8xl mx-auto flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button
              variant="secondary"
              onClick={onMenuToggle}
              className="p-2"
            >
              <Menu className="w-6 h-6" />
            </Button>
          )}
          <Logo />
        </div>

        {/* Center section - Search */}
        {/* {!isMobile && (
          <div className="flex-1 max-w-xl">
            <SearchBox />
          </div>
        )} */}

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* {isMobile && (
            <Button
              variant="secondary"
              onClick={() => setShowSearch(!showSearch)}
              className="p-2"
            >
              <Search className="w-5 h-5" />
            </Button>
          )} */}
          
          {/* <Button
            variant="secondary"
            className="p-2 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs flex items-center justify-center rounded-full">
              2
            </span>
          </Button> */}

          {!isMobile && (
            <div className="relative" ref={profileRef}>
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {user.initials}
                  </span>
                </div>
              </div>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search */}
      {isMobile && showSearch && (
        <div className="mt-3 px-4 pb-3 border-t pt-3">
          <SearchBox />
        </div>
      )}
    </header>
  );
}