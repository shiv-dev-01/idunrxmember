import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  size = 'md',
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 min-h-[40px]';
  
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const variantStyles = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300 shadow-sm hover:shadow',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-primary-200 hover:text-primary-600 disabled:bg-gray-50 disabled:text-gray-400'
  };
  
  return (
    <button 
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}