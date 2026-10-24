import React from 'react';
import { WelcomeHeader } from './WelcomeHeader';
import { CartProducts } from './CartProducts';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="section-container">
        <WelcomeHeader />
      </div>
      <div className="section-container">
        <CartProducts />
      </div>
    </div>
  );
}