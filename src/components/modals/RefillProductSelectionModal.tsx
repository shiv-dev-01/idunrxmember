import { useState } from "react";
import { Button } from "../ui/Button";
import type { WeightLossProduct } from "../../services/api/cart";

interface RefillProductSelectionModalProps {
  products: WeightLossProduct[];
  onSelect: (product: WeightLossProduct) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RefillProductSelectionModal({
  products,
  onSelect,
  onCancel,
  isLoading = false,
}: RefillProductSelectionModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  const handleSelect = () => {
    if (selectedProductId) {
      const product = products.find((p) => p.product_id === selectedProductId);
      if (product) {
        onSelect(product);
      }
    }
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm mb-4">
        What do you prefer for your next Refill?
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No products available
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {products.map((product) => (
            <div
              key={product.product_id}
              onClick={() => setSelectedProductId(product.product_id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedProductId === product.product_id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      checked={selectedProductId === product.product_id}
                      onChange={() => setSelectedProductId(product.product_id)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {product.product_name}
                    </h4>
                  </div>
                  {product.product_description && (
                    <p className="text-gray-600 text-xs sm:text-sm ml-6">
                      {product.product_description}
                    </p>
                  )}
                  {product.product_sku && (
                    <p className="text-gray-500 text-xs ml-6 mt-1">
                      SKU: {product.product_sku}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600 text-lg">
                    {formatPrice(product.product_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSelect}
          className="flex-1"
          disabled={!selectedProductId || isLoading}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
