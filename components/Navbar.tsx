"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, ShoppingBag, User, ShieldCheck, Search, X } from "lucide-react";

export default function Navbar({
  showSearch = true,
}: {
  showSearch?: boolean;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const currentQuery = searchParams.get("search") || "";
    startTransition(() => setSearchQuery(currentQuery));

    const checkUserAndCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }

        const { data: cartItems } = await supabase
          .from("cart_items")
          .select("quantity")
          .eq("user_id", user.id);

        if (cartItems) {
          const totalCount = cartItems.reduce(
            (acc, item) => acc + item.quantity,
            0,
          );
          setCartCount(totalCount);
        }
      }
    };

    checkUserAndCart();
    window.addEventListener("cart-updated", checkUserAndCart);

    return () => window.removeEventListener("cart-updated", checkUserAndCart);
  }, [searchParams, pathname, supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Cynthy Gozy <span className="text-blue-600">Collections</span>
            </span>
          </Link>

          {showSearch && (
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs text-slate-900 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-16 h-16 flex items-center justify-around gap-1 sm:gap-4 md:gap-8">
          {/* Home Button */}
          <Link
            href="/"
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
              pathname === "/"
                ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
            <span className="hidden md:inline">Home</span>
          </Link>

          {/* Admin Button */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                pathname === "/admin"
                  ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
              }`}
              title="Admin Portal"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          )}

          {/* Cart Button */}
          <Link
            href="/cart"
            data-cart-target="true"
            className={`p-2 rounded-xl transition relative flex items-center gap-1 text-xs font-semibold ${
              pathname === "/cart"
                ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            }`}
            title="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden md:inline">Cart</span>
            {cartCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account Button */}
          <Link
            href="/account"
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
              pathname === "/account"
                ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            }`}
            title="Account"
          >
            <User className="w-5 h-5" />
            <span className="hidden md:inline">Account</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
