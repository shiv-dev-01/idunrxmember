import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';

export function OrderSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((index) => (
        <div key={index} className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}