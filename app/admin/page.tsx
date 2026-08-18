"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  sizes?: string;
  colors?: string;
}

const CATEGORIES = ["All", "Clothes", "Shoes", "Jewelry"];

const PRESET_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "One Size",
  "Adjustable",
];

const PRESET_COLORS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Navy",
  "Green",
  "Olive",
  "Yellow",
  "Gold",
  "Silver",
  "Rose Gold",
  "Pink",
  "Purple",
  "Orange",
  "Brown",
  "Beige",
  "Grey",
  "Maroon",
  "Teal",
  "Multi-Color",
];

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Clothes");

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Variant States
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState("");

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColorInput, setCustomColorInput] = useState("");

  const supabase = createClient();

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "All") {
      query = query.eq("category", selectedCategory);
    }

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("Clothes");
    setImageFile(null);
    setPreviewUrl("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.price.toString());
    setCategory(product.category);
    setImageFile(null);
    setPreviewUrl(product.image_url);
    setSelectedSizes(
      product.sizes ? product.sizes.split(",").filter(Boolean) : [],
    );
    setSelectedColors(
      product.colors ? product.colors.split(",").filter(Boolean) : [],
    );
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const addSize = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !selectedSizes.includes(trimmed)) {
      setSelectedSizes([...selectedSizes, trimmed]);
    }
  };

  const addColor = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !selectedColors.includes(trimmed)) {
      setSelectedColors([...selectedColors, trimmed]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let finalImageUrl = previewUrl;

    // Upload selected gallery file to Supabase Storage
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, imageFile);

      if (uploadError) {
        alert("Image upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("products")
        .getPublicUrl(fileName);

      finalImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      name,
      description: description || "",
      price: parseFloat(price) || "",
      category: category || "Clothes",
      image_url: finalImageUrl || "",
      sizes: selectedSizes,
      colors: selectedColors,
    };

    let result;
    if (editingProduct) {
      result = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id);
    } else {
      result = await supabase.from("products").insert([payload]);
    }

    if (result.error) {
      alert("Failed to save product: " + result.error.message);
      setUploading(false);
      return;
    }
    alert("Product saved successfully!");
    setUploading(false);
    setIsModalOpen(false);
    window.location.reload();

    setUploading(false);
    setIsModalOpen(false);
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("Clothes");
    setImageFile(null);
    setPreviewUrl("");
    setSelectedSizes([]);
    setSelectedColors([]);
    fetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = confirm("Delete this product?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (!error) {
      fetchProducts();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Panel
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
              Product Management
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="h-64 rounded-2xl bg-white border border-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">
              No products found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Create a new product to begin listing items.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="relative h-48 bg-slate-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 truncate">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ₦{Number(product.price).toLocaleString()}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-xl text-[11px] font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-3 py-2 rounded-xl text-[11px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-y-auto max-h-[85vh] my-auto flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-bold">
                  Inventory
                </p>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Classic Leather Jacket"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.filter((cat) => cat !== "All").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Photo
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition relative overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                      <Upload className="w-6 h-6 mb-1 text-slate-400" />
                      <p className="text-[11px] font-semibold">
                        Click to pick photo from gallery
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select / Add Sizes
                </label>
                <select
                  onChange={(e) => {
                    addSize(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-1.5"
                >
                  <option value="" disabled>
                    Choose preset size...
                  </option>
                  {PRESET_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Or type custom size..."
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addSize(customSizeInput);
                      setCustomSizeInput("");
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedSizes.map((sz) => (
                    <span
                      key={sz}
                      className="bg-blue-50 text-blue-600 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      {sz}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSizes(
                            selectedSizes.filter((s) => s !== sz),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select / Add Colors
                </label>
                <select
                  onChange={(e) => {
                    addColor(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-1.5"
                >
                  <option value="" disabled>
                    Choose preset color...
                  </option>
                  {PRESET_COLORS.map((clr) => (
                    <option key={clr} value={clr}>
                      {clr}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Or type custom color..."
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addColor(customColorInput);
                      setCustomColorInput("");
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedColors.map((clr) => (
                    <span
                      key={clr}
                      className="bg-slate-100 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      {clr}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedColors(
                            selectedColors.filter((c) => c !== clr),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Add product details"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition"
              >
                {uploading
                  ? "Uploading Image..."
                  : editingProduct
                    ? "Update Product"
                    : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
