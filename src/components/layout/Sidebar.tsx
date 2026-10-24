import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { navItems } from '../../config/navigation';
import { getUserCartProducts } from '../../services/api';
import { storage } from '../../utils/storage';

interface SidebarProps {
  onLogout: () => void | Promise<void>;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const fetchCartProducts = async () => {
      try {
        const userData = storage.getUserData();
        if (!userData?.email) {
          throw new Error("User data not found");
        }
        const response = await getUserCartProducts(userData.email);
        if (response.status === 1 && Array.isArray(response.product)) {
          setProducts(response.product);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to fetch cart products:", err);
        setError(err.message || "Failed to fetch products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartProducts();
  }, []);

  // Check if any product has "Weight Loss" as the category
  const hasWeightLossCategory = products.some(product => product.product_category_name === "Weight Loss");

  // Filter navItems dynamically to include/exclude "Instruction Videos"
  const filteredNavItems = hasWeightLossCategory
    ? navItems
    : navItems.filter(item => item.label !== "Instruction Videos");

  return (
    <div 
      className={`hidden md:flex flex-col bg-white border-r min-h-screen relative transition-all duration-300 nav-section ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}
    >
      <Button
        variant="secondary"
        className="absolute -right-4 top-6 w-8 h-8 p-0 rounded-full border bg-white shadow-md flex items-center justify-center z-50 hover:bg-gray-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        ) : (
          <div>
          <ChevronLeft className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </Button>

      <div className="flex-1 p-6">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`nav-link group ${isActive ? 'active' : ''} ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isActive ? 'bg-primary-50' : 'group-hover:bg-gray-50'}
                  transition-colors
                `}>
                  <item.icon className={`
                    w-5 h-5
                    ${isActive ? 'text-primary-500' : 'text-gray-500 group-hover:text-primary-500'}
                  `} />
                </div>
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
          <button
            onClick={onLogout}
            className={`nav-link w-full group ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-50">
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-primary-500" />
            </div>
            {!isCollapsed && <span className="ml-3">Logout</span>}
          </button>
        </nav>
      </div>
    </div>
  );
}
