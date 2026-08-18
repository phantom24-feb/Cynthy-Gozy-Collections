"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageSquareCode,
} from "lucide-react";
import Link from "next/link";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    category: string;
  };
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const supabase = createClient();

  const fetchCart = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserName(user.user_metadata?.full_name || user.email || "Customer");
      const { data } = await supabase
        .from("cart_items")
        .select("id, quantity, products(id, name, price, image_url, category)")
        .eq("user_id", user.id);

      if (data) {
        setCartItems(data as unknown as CartItem[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (
    id: string,
    currentQty: number,
    delta: number,
  ) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", id);
    fetchCart();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    fetchCart();
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0,
  );

  const handleWhatsAppCheckout = () => {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

    let message = `*New Order - Cynthy Gozy Collections*\n`;
    message += `*Customer:* ${userName}\n`;
    message += `------------------------------------\n\n`;

    cartItems.forEach((item, index) => {
      message += `${index + 1}. *${item.products.name}*\n`;
      message += `   Qty: ${item.quantity} | Price: ₦${(item.products.price * item.quantity).toLocaleString()}\n\n`;
    });

    message += `------------------------------------\n`;
    message += `*Total Amount:* ₦${subtotal.toLocaleString()}\n\n`;
    message += `Please confirm my order details!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodedMessage}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-600" /> Your Shopping Cart
        </h1>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100"
              />
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">
              Your cart is empty
            </h3>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cart Item List */}
            <div className="md:col-span-2 space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-16 h-16 object-cover rounded-xl bg-slate-50"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.products.name}
                      </h4>
                      <p className="text-xs font-extrabold text-blue-600 mt-0.5">
                        ₦{Number(item.products.price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity, -1)
                        }
                        className="p-1 hover:bg-white text-slate-600 rounded-lg transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity, 1)
                        }
                        className="p-1 hover:bg-white text-slate-600 rounded-lg transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary & WhatsApp Button */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
                Order Summary
              </h3>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
              >
                <MessageSquareCode className="w-4 h-4" /> Order via WhatsApp
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
