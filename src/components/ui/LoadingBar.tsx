import React, { useEffect } from 'react';
import NProgress from 'nprogress';
import '../../styles/nprogress.css';

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
});

interface LoadingBarProps {
  isLoading: boolean;
}

export function LoadingBar({ isLoading }: LoadingBarProps) {
  useEffect(() => {
    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }

    return () => {
      NProgress.done();
    };
  }, [isLoading]);

  return null;
}