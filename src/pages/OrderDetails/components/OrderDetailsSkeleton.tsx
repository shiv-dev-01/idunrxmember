import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';

export function OrderDetailsSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Order Info Skeleton */}
        <div className="card">
          <div className="flex items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-24 mt-4" />
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>

        {/* Timeline Skeleton */}
        <div className="card">
          <Skeleton className="h-6 w-40 mb-6" />
          
          <div className="space-y-8">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tracking Info Skeleton */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>

          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}