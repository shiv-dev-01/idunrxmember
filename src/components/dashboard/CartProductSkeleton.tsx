import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function CartProductSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((index) => (
          <div 
            key={index}
            className="flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0"
          >
            <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-4 mt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}