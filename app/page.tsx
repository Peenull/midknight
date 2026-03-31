"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="w-full max-w-md">
        {/* Glass effect card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 sm:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="mb-2 text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              midKnight
            </h1>
            <p className="text-sm text-white/60">Client Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block">
                <span className="text-sm font-semibold text-white/90 mb-2 inline-block">Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                  placeholder="your@email.com"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-semibold text-white/90 mb-2 inline-block">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                  placeholder="••••••••"
                  required
                />
              </label>
            </div>

            {error && <p className="text-sm text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-lg p-3">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white hover:from-purple-500 hover:to-pink-500 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 active:scale-95"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-white/50 text-center">
              Firebase Authentication Required<br />
              <span className="text-white/40">Contact admin for account setup</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
