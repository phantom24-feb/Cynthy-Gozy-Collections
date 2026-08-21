"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogOut,
  Moon,
  Sun,
  Save,
  Users,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { setTheme } from "@/components/ThemeProvider";

export default function AccountContent() {
  const [profile, setProfile] = useState<{
    full_name?: string;
    email?: string;
    phone?: string;
    created_at?: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [customers, setCustomers] = useState<
    { id: string; full_name?: string; phone?: string }[]
  >([]);
  const [deliveredSales, setDeliveredSales] = useState({
    products: 0,
    revenue: 0,
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setCurrentTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("cynthy-gozy-theme") === "dark"
      ? "dark"
      : "light";
  });
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile({
          full_name:
            data?.full_name || user.user_metadata?.full_name || "Customer",
          email: user.email,
          phone: data?.phone || user.user_metadata?.phone || "Not provided",
          created_at: user.created_at,
        });
        setEditName(data?.full_name || user.user_metadata?.full_name || "");
        setEditEmail(user.email || "");
        setEditPhone(data?.phone || user.user_metadata?.phone || "");

        const admin = data?.role === "admin";
        setIsAdmin(admin);
        const { data: about } = await supabase
          .from("about_us")
          .select("content")
          .eq("id", 1)
          .maybeSingle();
        setAboutText(about?.content || "Cynthy Gozy Collections brings quality fashion pieces to you.");

        if (admin) {
          const [{ data: customerRows }, { data: deliveredOrders }] =
            await Promise.all([
              supabase
                .from("profiles")
                .select("id, full_name, phone")
                .neq("id", user.id)
                .order("created_at", { ascending: false }),
              supabase
                .from("orders")
                .select("total, items, status")
                .eq("status", "delivered"),
            ]);
          setCustomers(customerRows || []);
          const sales = (deliveredOrders || []).reduce(
            (summary, order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              return {
                products:
                  summary.products +
                  items.reduce(
                    (count, item) => count + Number(item.quantity || 0),
                    0,
                  ),
                revenue: summary.revenue + Number(order.total || 0),
              };
            },
            { products: 0, revenue: 0 },
          );
          setDeliveredSales(sales);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const saveAccount = async () => {
    setSaving(true);
    setAccountMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: editName.trim(), phone: editPhone.trim() })
      .eq("id", user.id);
    const { error: authError } = await supabase.auth.updateUser({
      email: editEmail.trim(),
      data: { full_name: editName.trim(), phone: editPhone.trim() },
    });
    if (profileError || authError) {
      setAccountMessage(profileError?.message || authError?.message || "Unable to update account.");
    } else {
      setProfile((current) =>
        current
          ? { ...current, full_name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() }
          : current,
      );
      setEditing(false);
      setAccountMessage("Account details updated.");
    }
    setSaving(false);
  };

  const saveAbout = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("about_us")
      .upsert({ id: 1, content: aboutText.trim() });
    setAccountMessage(error ? error.message : "About Us updated.");
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar showSearch={false} />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 flex-1 w-full">
        <h1 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" /> My Account
        </h1>

        {loading ? (
          <div className="h-48 bg-white rounded-2xl animate-pulse border border-slate-100" />
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-4 border-b pb-4">
              <div className="h-14 w-14 rounded-full bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {profile?.full_name}
                </h2>
                <p className="text-xs text-slate-500">Registered Customer</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>{profile?.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  Joined{" "}
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>

            {accountMessage && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                {accountMessage}
              </p>
            )}

            {editing && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void saveAccount()}
                  disabled={saving}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="mr-2 inline h-4 w-4" />
                  {saving ? "Saving..." : "Save Account Details"}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="w-full rounded-xl border border-blue-200 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              {editing ? "Cancel Editing" : "Edit Account Details"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full mt-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              Use {theme === "dark" ? "Light" : "Dark"} Mode
            </button>

            <button
              onClick={handleSignOut}
              className="w-full mt-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900">About Us</h2>
          {isAdmin ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={aboutText}
                onChange={(event) => setAboutText(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => void saveAbout()}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save About Us"}
              </button>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">
              {aboutText}
            </p>
          )}
        </section>

        {isAdmin && (
          <section className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {customers.length}
                </p>
                <p className="text-xs text-slate-500">Registered customers</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {deliveredSales.products}
                </p>
                <p className="text-xs text-slate-500">Products sold and delivered</p>
                <p className="mt-1 text-xs font-bold text-emerald-600">
                  ₦{deliveredSales.revenue.toLocaleString()} delivered revenue
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-900">Customers</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex flex-wrap justify-between gap-2 py-3 text-xs">
                    <span className="font-semibold text-slate-800">{customer.full_name || "Customer"}</span>
                    <span className="text-slate-500">{customer.phone || "No phone number"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
