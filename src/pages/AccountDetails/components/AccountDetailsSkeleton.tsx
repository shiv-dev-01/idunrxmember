import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';

export function AccountDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-1 mt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}