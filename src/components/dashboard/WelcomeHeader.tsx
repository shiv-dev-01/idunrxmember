import React from 'react';
import { useUser } from '../../hooks/useUser';
import { useParams } from 'react-router-dom';
import { useCartProducts } from '../../hooks/useCartProducts';

export function WelcomeHeader() {
  const user = useUser();
  const { orderId } = useParams<{ orderId: string }>();
  const { products, isLoading, error } = useCartProducts();


  console.log("user",user);
  console.log("products",products);
  
  
  return (
    <div className="mb-4 md:mb-6 welcome-section">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">👋 Welcome {user.name}</h2>
      <p className="text-sm md:text-base text-gray-600 mt-1">
        Manage your subscription and account details below
      </p>
    </div>
  );
}