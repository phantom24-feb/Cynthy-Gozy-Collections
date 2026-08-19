"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface Order {
  id: string;
  total: number;
  status: "processing" | "confirmed";
  created_at: string;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState<"processing" | "confirmed" | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchCart = useCallback(async () => {
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

      const { data: orderHistory } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const typedOrders = (orderHistory || []) as Order[];
      setOrders(typedOrders);
      setOrderStatus(typedOrders[0]?.status || null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void fetchCart());
  }, [fetchCart]);

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

  const handleWhatsAppCheckout = async () => {
    const whatsappNumber = (
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""
    ).replace(/\D/g, "");
    if (!whatsappNumber || cartItems.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: userName,
        total: subtotal,
        items: cartItems.map((item) => ({
          product_id: item.products.id,
          name: item.products.name,
          quantity: item.quantity,
          price: item.products.price,
        })),
        status: "processing",
      })
      .select("id, total, status, created_at")
      .single();

    if (orderError || !order) return;

    const { error: clearCartError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);
    if (clearCartError) return;

    setCartItems([]);
    setOrders((current) => [order as Order, ...current]);

    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodedMessage}`,
      "_blank",
    );
    setOrderStatus("processing");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar showSearch={false} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 flex-1 w-full space-y-6">
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
                    <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden">
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    </div>
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
                disabled={orderStatus === "processing"}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-70"
              >
                <MessageSquareCode className="w-4 h-4" />
                {orderStatus === "confirmed"
                  ? "Order Confirmed"
                  : orderStatus === "processing"
                    ? "Order Processing"
                    : "Order via WhatsApp"}
              </button>
            </div>
          </div>
        )}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900">Your Orders</h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-sm text-slate-500">
              You have not placed any orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-blue-600">
                      ₦{Number(order.total).toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase mt-1 ${
                        order.status === "confirmed"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
