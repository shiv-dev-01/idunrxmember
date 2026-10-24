import { useState, useEffect } from "react";
import { getUserCartProducts } from "../services/api";
import { storage } from "../utils/storage";
import type { CartProduct } from "../types/products";

export function useCartProducts() {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const userData = storage.getUserData();
        if (!userData?.email) {
          throw new Error("User data not found");
        }

        const response = await getUserCartProducts(userData.email);

        if (response.status === 1 && Array.isArray(response.product)) {
          // Ensure we only pass serializable data
          const sanitizedProducts = response.product.map((product) => ({
            product_id: product.product_id,
            product_name: product.product_name,
            product_description: product.product_description,
            product_price: product.product_price,
            product_sku: product.product_sku,
            product_category_name: product.product_category_name,
            product_img: product?.product_img,
            time: product.time,
            order_id: product.order_id,
          }));
          setProducts(sanitizedProducts);
        } else {
          setProducts([]);
        }
      } catch (error: any) {
        console.error("Failed to fetch cart products:", error);
        setError(error.message || "Failed to fetch products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const productCategory = products[0]?.product_category_name || '';

  return { products, isLoading, error, productCategory  };
}
