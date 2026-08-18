"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Flame, ChevronRight, Layers } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
}

const CATEGORIES = ["All", "Clothes", "Shoes", "Jewelry"];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "All") {
        query = query.eq("category", selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      console.log("Homepage fetched products:", data, "Error:", error);
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedCategory, searchQuery]);

  // Auto-scroll mechanism for horizontal feature carousel
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const interval = setInterval(() => {
      if (
        carousel.scrollLeft + carousel.clientWidth >=
        carousel.scrollWidth - 10
      ) {
        carousel.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        carousel.scrollBy({ left: 240, behavior: "smooth" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [products]);

  const trendingProducts = products.slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Hero Announcement Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-6 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Premium Quality
            Collections
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Cynthy Gozy Collections
          </h1>
          <p className="text-xs text-blue-100 max-w-md mx-auto">
            Browse Clothes, Shoes & Jewelry. Sign up to add to cart and order
            directly via WhatsApp!
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-8">
        {/* Auto-Scrolling Showcase Carousel */}
        {!loading && products.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Featured
                Highlights
              </h2>
              <span className="text-[11px] text-blue-600 font-medium flex items-center">
                Auto-sliding <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div
              ref={carouselRef}
              className="flex space-x-3 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {products.map((product) => (
                <div
                  key={`carousel-${product.id}`}
                  className="min-w-[180px] sm:min-w-[220px] bg-white rounded-2xl p-2 border border-slate-100 shadow-sm flex-shrink-0"
                >
                  <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden mb-2">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 truncate">
                    {product.name}
                  </h4>
                  <p className="text-xs font-extrabold text-blue-600 mt-1">
                    ₦{Number(product.price).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending / Hot Products Section */}
        {!loading &&
          trendingProducts.length > 0 &&
          selectedCategory === "All" && (
            <section className="space-y-3 bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-red-500 text-white rounded-xl shadow-sm">
                    <Flame className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Trending Now
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Hot items customers are loving right now
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {trendingProducts.map((product) => (
                  <ProductCard
                    key={`trending-${product.id}`}
                    product={product}
                  />
                ))}
              </div>
            </section>
          )}

        {/* Main Catalog & Category Tabs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              All Collections
            </h2>
          </div>

          <div className="flex items-center justify-start sm:justify-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">
                No products found
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a different category or check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Cynthy Gozy Collections. All rights
        reserved.
      </footer>
    </div>
  );
}
