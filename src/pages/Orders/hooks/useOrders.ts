import { useState, useEffect } from 'react';
import { getUserOrders } from '../../../services/api';
import { storage } from '../../../utils/storage';
import type { Order } from '../../../types/orders';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const userData = storage.getUserData();
        if (!userData?.userId || !userData?.email) {
          throw new Error('User data not found');
        }

        const response = await getUserOrders(userData.userId, userData.email);
        
        if (response.status === 1 && response.product) {
          const mappedOrders: Order[] = response.product.map(order => ({
            id: order.order_id,
            date: order.time,
            status: order.tracking_number ? 'shipped' : 'processing',
            productImage: order.product_img,
            trackingNumber: order.tracking_number || undefined,
            productName: order.product_name || undefined
          }));
          setOrders(mappedOrders);
        } else {
          setOrders([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        setError(error.message || 'Failed to fetch orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return { orders, isLoading, error };
}