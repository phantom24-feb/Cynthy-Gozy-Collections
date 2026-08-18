"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo Badge */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
          CG
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900">
          Sign in
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Welcome back to Cynthy Gozy Collections
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border placeholder:text-slate-400 text-slate-900 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-600">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Remember me
              </label>
              <a
                href="#"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium text-sm rounded-xl shadow-sm hover:bg-blue-700 transition duration-150 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
