"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Flame } from "lucide-react";
import { useSearchParams } from "next/navigation";

const CATEGORIES = ["All", "Men", "Women", "Clothes", "Shoes", "Jewelries"];

function ProductCarouselRow({
  products,
  onSelect,
  hideLastOnMobile = false,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
  hideLastOnMobile?: boolean;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let isInteracting = false;
    let interactionTimeout: number | undefined;
    const pauseForInteraction = () => {
      isInteracting = true;
      if (interactionTimeout) window.clearTimeout(interactionTimeout);
      interactionTimeout = window.setTimeout(() => {
        isInteracting = false;
      }, 2500);
    };

    carousel.addEventListener("pointerdown", pauseForInteraction);
    carousel.addEventListener("touchstart", pauseForInteraction, {
      passive: true,
    });
    carousel.addEventListener("wheel", pauseForInteraction, { passive: true });
    carousel.addEventListener("scroll", pauseForInteraction, { passive: true });

    const interval = window.setInterval(() => {
      if (isInteracting || carousel.scrollWidth <= carousel.clientWidth + 8) {
        return;
      }

      const firstCard = carousel.firstElementChild as HTMLElement | null;
      const scrollAmount = firstCard
        ? firstCard.offsetWidth + 8
        : carousel.clientWidth * 0.8;
      const atEnd =
        carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 8;

      carousel.scrollTo({
        left: atEnd ? 0 : carousel.scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }, 3500);

    return () => {
      window.clearInterval(interval);
      if (interactionTimeout) window.clearTimeout(interactionTimeout);
      carousel.removeEventListener("pointerdown", pauseForInteraction);
      carousel.removeEventListener("touchstart", pauseForInteraction);
      carousel.removeEventListener("wheel", pauseForInteraction);
      carousel.removeEventListener("scroll", pauseForInteraction);
    };
  }, [products]);

  return (
    <div
      ref={carouselRef}
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none px-1 pb-2 sm:gap-3 sm:px-0"
    >
      {products.map((product) => (
        <div
          key={product.id}
          className={`${hideLastOnMobile && products.length === 11 && product === products[10] ? "hidden sm:block" : ""} min-w-[46vw] snap-start sm:min-w-[220px]`}
        >
          <ProductCard
            product={product}
            compact
            onSelect={() => onSelect(product)}
          />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory === "Men") {
        query = query.eq("gender", "Male");
      } else if (selectedCategory === "Women") {
        query = query.eq("gender", "Female");
      } else if (selectedCategory !== "All") {
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
  }, [selectedCategory, searchQuery, supabase]);

  const trendingProducts = products
    .filter((product) => product.trending)
    .slice(0, 11);
  const productRows = Array.from(
    { length: Math.ceil(products.length / 11) },
    (_, index) => products.slice(index * 11, index * 11 + 11),
  );

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
            Browse Clothes, Shoes & Jewelries.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 flex-1 w-full space-y-8">
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

              <ProductCarouselRow
                products={trendingProducts}
                onSelect={setSelectedProduct}
                hideLastOnMobile
              />
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
              {[...Array(10)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">
                No products found
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a different category or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {productRows.map((row, index) => (
                <ProductCarouselRow
                  key={`product-row-${index}`}
                  products={row}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
            <ProductCard product={selectedProduct} />
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Cynthy Gozy Collections. All rights
        reserved.
      </footer>
    </div>
  );
}
