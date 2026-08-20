"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Phone, Calendar, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { setTheme } from "@/components/ThemeProvider";

export default function AccountContent() {
  const [profile, setProfile] = useState<{
    full_name?: string;
    email?: string;
    phone?: string;
    created_at?: string;
  } | null>(null);
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
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

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

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full mt-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
      </main>
    </div>
  );
}
