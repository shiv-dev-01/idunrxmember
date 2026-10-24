import React from 'react';
import { PackageSearch } from 'lucide-react';
import { OrderList } from './components/OrderList';
import { OrderSkeleton } from './components/OrderSkeleton';
import { useOrders } from './hooks/useOrders';
import { LoadingBar } from '../../components/ui/LoadingBar';

export function Orders() {
  const { orders, isLoading, error } = useOrders();

  return (
    <>
      <LoadingBar isLoading={isLoading} />
      
      <div className="space-y-6">
        <div className="section-container">
          <h2 className="section-title">📦 Your Orders</h2>
          <p className="text-sm md:text-base text-gray-600">
            View and track all your orders
          </p>
        </div>

        <div className="section-container">
          {isLoading ? (
            <OrderSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <PackageSearch className="w-16 h-16 text-red-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Orders</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <PackageSearch className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
              <p className="text-gray-600">You haven't placed any orders yet.</p>
            </div>
          ) : (
            <OrderList orders={orders} />
          )}
        </div>
      </div>
    </>
  );
}