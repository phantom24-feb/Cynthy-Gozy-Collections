"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  gender?: "Male" | "Female" | "Unisex" | string;
  trending?: boolean;
  image_url: string;
  stock?: number;
  sizes?: string;
  colors?: string;
}

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  onSelect?: () => void;
}

export default function ProductCard({
  product,
  compact = false,
  onSelect,
}: ProductCardProps) {
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
  const imageRef = useRef<HTMLImageElement>(null);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const animateCartAdd = () => {
    const image = imageRef.current;
    const cartTarget = document.querySelector<HTMLElement>(
      '[data-cart-target="true"]',
    );
    if (!image || !cartTarget) return;

    const imageRect = image.getBoundingClientRect();
    const cartRect = cartTarget.getBoundingClientRect();
    const flyingImage = image.cloneNode(true) as HTMLImageElement;
    const startX = imageRect.left;
    const startY = imageRect.top;
    const endX = cartRect.left + cartRect.width / 2 - imageRect.width * 0.12;
    const endY = cartRect.top + cartRect.height / 2 - imageRect.height * 0.12;

    Object.assign(flyingImage.style, {
      position: "fixed",
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${imageRect.width}px`,
      height: `${imageRect.height}px`,
      objectFit: "cover",
      borderRadius: "12px",
      zIndex: "100",
      pointerEvents: "none",
      transition:
        "transform 700ms cubic-bezier(.2,.8,.3,1), opacity 700ms ease",
    });
    document.body.appendChild(flyingImage);

    requestAnimationFrame(() => {
      flyingImage.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`;
      flyingImage.style.opacity = "0.2";
    });
    window.setTimeout(() => flyingImage.remove(), 750);
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push("/login?redirectTo=/");
        return;
      }

      const { data: existingItems, error: findError } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .limit(1);

      if (findError) throw findError;

      const existingItem = existingItems?.[0];

      if (existingItem) {
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (updateError) throw updateError;
      } else {
        const itemWithVariants = {
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          selected_size: selectedSize || null,
          selected_color: selectedColor || null,
        };
        const result = await supabase
          .from("cart_items")
          .insert([itemWithVariants]);

        if (result.error) {
          const fallbackResult = await supabase.from("cart_items").insert([
            {
              user_id: user.id,
              product_id: product.id,
              quantity: 1,
            },
          ]);

          if (fallbackResult.error) throw result.error;
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart-updated"));
      }
      animateCartAdd();
      setAdded(true);
      window.setTimeout(() => setAdded(false), 5000);
    } catch (error) {
      console.error("Unable to add item to cart:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
        onSelect ? "cursor-pointer" : ""
      }`}
    >
      <div>
        <div
          className={`group w-full rounded-xl overflow-hidden mb-2 relative ${
            compact ? "h-32 sm:h-44 bg-slate-100" : "h-64 sm:h-80 bg-white"
          }`}
        >
          <img
            ref={imageRef}
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${
              compact ? "object-cover" : "object-contain"
            }`}
          />
          <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            {product.category}
          </span>
          {product.gender && (
            <span className="absolute top-2 right-2 bg-white/90 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
              {product.gender}
            </span>
          )}
        </div>

        <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs font-extrabold text-blue-600 mt-0.5">
          ₦{Number(product.price).toLocaleString()}
        </p>

        {!compact && (sizeList.length > 0 || colorList.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {sizeList.length > 0 && (
              <div>
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
              <div>
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
        )}

        {!compact && product.description && (
          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation();
          void handleAddToCart();
        }}
        disabled={adding}
        className="w-full mt-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" /> Added Successfully
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
