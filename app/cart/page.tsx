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
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CartItem {
  id: string;
  quantity: number;
  created_at?: string;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | string[];
    category: string;
  };
}

interface Order {
  id: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  items?: OrderItem[];
}

type OrderStatus = "processing" | "confirmed" | "shipped" | "delivered";

const ORDER_STATUSES: OrderStatus[] = [
  "processing",
  "confirmed",
  "shipped",
  "delivered",
];

function normalizeOrderStatus(value: string): OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "processing";
}

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

const DEFAULT_WHATSAPP_NUMBER = "2348147850652";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const fetchCart = useCallback(async () => {
    setLoading(true);
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch {
      setLoading(false);
      return;
    }

    if (user) {
      setUserName(user.user_metadata?.full_name || user.email || "Customer");
      const [
        { data: initialData, error: initialCartError },
        { data: profile },
      ] = await Promise.all(
        [
          supabase
            .from("cart_items")
            .select(
              "id, quantity, created_at, products(id, name, price, image_url, category)",
            )
            .eq("user_id", user.id),
          supabase
            .from("profiles")
            .select("delivery_address")
            .eq("id", user.id)
            .maybeSingle(),
        ],
      );
      let data = initialData;
      let cartError = initialCartError;

      if (cartError?.message?.includes("created_at")) {
        const fallbackCart = await supabase
          .from("cart_items")
          .select("id, quantity, products(id, name, price, image_url, category)")
          .eq("user_id", user.id);
        data = fallbackCart.data as typeof data;
        cartError = fallbackCart.error;
      }
      if (cartError) throw cartError;
      setDeliveryAddress(
        profile?.delivery_address || user.user_metadata?.delivery_address || "",
      );

      if (data) {
        const cutoff = Date.now() - 20 * 24 * 60 * 60 * 1000;
        const freshItems = (data as unknown as CartItem[]).filter(
          (item) =>
            !item.created_at || new Date(item.created_at).getTime() > cutoff,
        );
        const expiredItems = (data as unknown as CartItem[]).filter(
          (item) =>
            item.created_at && new Date(item.created_at).getTime() <= cutoff,
        );
        if (expiredItems.length > 0) {
          await supabase
            .from("cart_items")
            .delete()
            .in(
              "id",
              expiredItems.map((item) => item.id),
            );
          setCartNotice("Items left in your cart for 20 days were cleared.");
        } else if (
          freshItems.some(
            (item) =>
              item.created_at &&
              Date.now() - new Date(item.created_at).getTime() >=
                15 * 24 * 60 * 60 * 1000,
          )
        ) {
          setCartNotice(
            "Your cart will be cleared after 20 days if you do not place an order.",
          );
        }
        setCartItems(freshItems);
      }

      const { data: orderHistory } = await supabase
        .from("orders")
        .select("id, total, status, created_at, items")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const typedOrders = ((orderHistory || []) as Order[]).map((order) => ({
        ...order,
        status: normalizeOrderStatus(order.status),
      }));
      setOrders(typedOrders);
      setOrderStatus(null);
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
    if (checkoutLoading) return;

    const whatsappNumber = (
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
    ).replace(/\D/g, "");
    if (!whatsappNumber) {
      setCheckoutError("WhatsApp is not configured for this store.");
      return;
    }
    if (cartItems.length === 0) return;

    setCheckoutError(null);
    setCheckoutLoading(true);
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes("android");
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    let message = `*New Order - Cynthy Gozy Collections*\n`;
    message += `*Customer:* ${userName}\n`;
    message += `*Delivery Address:* ${deliveryAddress.trim() || "Not provided"}\n`;
    message += `------------------------------------\n\n`;

    cartItems.forEach((item, index) => {
      message += `${index + 1}. *${item.products.name}*\n`;
      message += `   Qty: ${item.quantity} | Price: ₦${(item.products.price * item.quantity).toLocaleString()}\n\n`;
    });

    message += `------------------------------------\n`;
    message += `*Total Amount:* ₦${subtotal.toLocaleString()}\n\n`;
    message += `Please confirm my order details!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappWebUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    if (isAndroid) {
      const businessUrl = `intent://send?phone=${whatsappNumber}&text=${encodedMessage}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(whatsappWebUrl)};end`;
      const personalUrl = `intent://send?phone=${whatsappNumber}&text=${encodedMessage}#Intent;package=com.whatsapp;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(businessUrl)};end`;
      let whatsappOpened = false;

      const markWhatsAppOpened = () => {
        whatsappOpened = true;
      };
      window.addEventListener("pagehide", markWhatsAppOpened, { once: true });

      // eslint-disable-next-line react-hooks/immutability -- Must navigate synchronously from the click event.
      window.location.href = personalUrl;
      window.setTimeout(() => {
        window.removeEventListener("pagehide", markWhatsAppOpened);
        if (!whatsappOpened && document.visibilityState === "visible") {
          window.location.href = businessUrl;
        }
      }, 800);
    } else if (isIOS) {
      const personalUrl = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;
      const businessUrl = `whatsapp-business://send?phone=${whatsappNumber}&text=${encodedMessage}`;
      let whatsappOpened = false;

      const markWhatsAppOpened = () => {
        whatsappOpened = true;
      };
      window.addEventListener("pagehide", markWhatsAppOpened, { once: true });

      // eslint-disable-next-line react-hooks/immutability -- Must navigate synchronously from the click event.
      window.location.href = personalUrl;
      window.setTimeout(() => {
        window.removeEventListener("pagehide", markWhatsAppOpened);
        if (!whatsappOpened && document.visibilityState === "visible") {
          window.location.href = businessUrl;
        }
      }, 800);
    } else {
      // eslint-disable-next-line react-hooks/immutability -- Must navigate synchronously from the click event.
      window.location.href = whatsappWebUrl;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login?redirectTo=/cart");
        return;
      }

      let { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: userName,
          delivery_address: deliveryAddress.trim(),
          total: subtotal,
          items: cartItems.map((item) => ({
            product_id: item.products.id,
            name: item.products.name,
            quantity: item.quantity,
            price: item.products.price,
            image_url: item.products.image_url,
          })),
          status: "processing",
        })
        .select("id, total, status, created_at, items")
        .single();

      if (orderError?.message?.includes("delivery_address")) {
        const fallbackOrder = await supabase
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
              image_url: item.products.image_url,
            })),
            status: "processing",
          })
          .select("id, total, status, created_at, items")
          .single();
        order = fallbackOrder.data;
        orderError = fallbackOrder.error;
      }

      if (orderError || !order) {
        throw orderError || new Error("The order could not be created.");
      }

      if (deliveryAddress.trim()) {
        await supabase
          .from("profiles")
          .update({ delivery_address: deliveryAddress.trim() })
          .eq("id", user.id);
      }

      const { error: clearCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);
      if (clearCartError) throw clearCartError;

      setCartItems([]);
      setOrders((current) => [order as Order, ...current]);
      setOrderStatus("processing");
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Unable to submit your order. Please try again.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar showSearch={false} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 flex-1 w-full space-y-6">
        {cartNotice && (
          <p
            className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800"
            role="status"
          >
            {cartNotice}
          </p>
        )}
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
                      {getFirstImage(item.products.image_url) ? (
                        <img
                          src={getFirstImage(item.products.image_url)}
                          alt={item.products.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-slate-400">
                          No image
                        </div>
                      )}
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

              <label className="block text-xs font-semibold text-slate-700">
                Delivery address and landmark
                <textarea
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Street, area, city, and a notable landmark"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <button
                onClick={handleWhatsAppCheckout}
                disabled={orderStatus === "processing" || checkoutLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-70"
              >
                <MessageSquareCode className="w-4 h-4" />
                {orderStatus === "confirmed"
                  ? "Order Confirmed"
                  : orderStatus === "processing"
                    ? "Order Processing"
                    : checkoutLoading
                      ? "Opening WhatsApp..."
                      : "Order via WhatsApp"}
              </button>
              {checkoutError && (
                <p className="text-xs text-red-600" role="alert">
                  {checkoutError}
                </p>
              )}
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
                <div key={order.id}>
                  <article
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      setSelectedOrder(order);
                  }}
                  className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {(order.items || [])
                        .slice(0, 3)
                        .map((item, index) =>
                          getFirstImage(item.image_url) ? (
                            <img
                              key={`${order.id}-image-${index}`}
                              src={getFirstImage(item.image_url)}
                              alt={item.name}
                              className="h-10 w-10 rounded-lg border-2 border-white bg-slate-100 object-cover"
                            />
                          ) : null,
                        )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-blue-600">
                      ₦{Number(order.total).toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase mt-1 ${
                        order.status === "delivered"
                          ? "text-emerald-600"
                          : order.status === "shipped"
                            ? "text-blue-600"
                            : order.status === "confirmed"
                              ? "text-emerald-600"
                              : "text-amber-600"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                  </article>
                  <div className="grid grid-cols-4 gap-1 px-1 pt-2">
                  {ORDER_STATUSES.map((status, index) => (
                    <div key={status} className="space-y-1 text-center">
                      <div
                        className={`h-1.5 rounded-full ${
                          ORDER_STATUSES.indexOf(order.status) >= index
                            ? "bg-emerald-500"
                            : "bg-slate-200"
                        }`}
                      />
                      <span className="block text-[9px] font-semibold capitalize text-slate-500">
                        {status}
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Order #{selectedOrder.id.slice(0, 8)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-2 text-slate-500"
                  aria-label="Close order details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(selectedOrder.items || []).map((item, index) => (
                  <div
                    key={`${selectedOrder.id}-detail-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    {getFirstImage(item.image_url) ? (
                      <img
                        src={getFirstImage(item.image_url)}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg bg-slate-100 object-cover"
                      />
                    ) : null}
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-slate-500">
                        Quantity: {item.quantity}
                      </p>
                      <p className="mt-1 font-extrabold text-blue-600">
                        ₦{Number(item.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-right text-sm font-extrabold text-blue-600">
                Total: ₦{Number(selectedOrder.total).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
