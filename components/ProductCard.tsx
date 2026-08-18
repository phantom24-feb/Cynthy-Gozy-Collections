"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShoppingCart, Check } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock?: number;
  sizes?: string;
  colors?: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const sizeList = product.sizes
    ? product.sizes.split(",").filter(Boolean)
    : [];
  const colorList = product.colors
    ? product.colors.split(",").filter(Boolean)
    : [];

  const [selectedSize, setSelectedSize] = useState<string>(sizeList[0] || "");
  const [selectedColor, setSelectedColor] = useState<string>(
    colorList[0] || "",
  );
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const supabase = createClient();

  const handleAddToCart = async () => {
    setAdding(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to add items to your cart.");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
        selected_size: selectedSize,
        selected_color: selectedColor,
      },
    ]);

    setAdding(false);
    if (!error) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="h-36 sm:h-44 w-full bg-slate-100 rounded-xl overflow-hidden mb-2 relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            {product.category}
          </span>
        </div>

        <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs font-extrabold text-blue-600 mt-0.5">
          ₦{Number(product.price).toLocaleString()}
        </p>

        {sizeList.length > 0 && (
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-slate-500 block mb-1">
              Size:
            </span>
            <div className="flex flex-wrap gap-1">
              {sizeList.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border transition ${
                    selectedSize === sz
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}

        {colorList.length > 0 && (
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-slate-500 block mb-1">
              Color:
            </span>
            <div className="flex flex-wrap gap-1">
              {colorList.map((clr) => (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setSelectedColor(clr)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border transition ${
                    selectedColor === clr
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {clr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleAddToCart}
        disabled={adding}
        className={`w-full mt-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
          added
            ? "bg-emerald-600 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" /> Added!
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
          </>
        )}
      </button>
    </div>
  );
}
