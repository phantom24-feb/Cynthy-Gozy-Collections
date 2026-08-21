"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image_url?: string | string[];
}

function getFirstImage(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  if (!value) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed))
      return typeof parsed[0] === "string" ? parsed[0] : "";
  } catch {
    // Keep supporting existing single-image URLs.
  }
  return value;
}

interface Order {
  id: string;
  customer_name: string;
  total: number;
  items: OrderItem[];
  status: OrderStatus;
  created_at: string;
}

type OrderStatus = "processing" | "confirmed" | "shipped" | "delivered";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, total, items, status, created_at")
      .order("created_at", { ascending: false });

    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void fetchOrders());
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (!error) {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order,
        ),
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar showSearch={false} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-blue-600 font-bold">
              Admin Panel
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" /> Orders
            </h1>
          </div>
          <Link
            href="/admin"
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
          >
            Inventory
          </Link>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-white animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500">
            No orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {order.customer_name || "Customer"}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-blue-600">
                      ₦{Number(order.total).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold uppercase mt-1 text-emerald-600">
                      {order.status}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3 space-y-1">
                  {order.items.map((item, index) => (
                    <div
                      key={`${order.id}-${index}`}
                      className="flex items-center gap-3 text-xs text-slate-600"
                    >
                      {getFirstImage(item.image_url) ? (
                        <img
                          src={getFirstImage(item.image_url)}
                          alt={item.name}
                          className="h-12 w-12 rounded-lg bg-slate-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[9px] text-slate-400">
                          No image
                        </div>
                      )}
                      <span>
                        {item.quantity} x {item.name} - ₦
                        {Number(item.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  Order status
                  <select
                    value={order.status}
                    onChange={(event) =>
                      void updateOrderStatus(
                        order.id,
                        event.target.value as OrderStatus,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="processing">Processing</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
