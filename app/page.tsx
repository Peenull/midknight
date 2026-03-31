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
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-8 shadow-md">
        <h1 className="mb-6 text-3xl font-bold text-zinc-900 text-center">
          midKnight Sign In
        </h1>
        <p className="mb-4 text-sm text-zinc-600">
          No sign up; use existing Firebase account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 focus:border-indigo-500 focus:outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 focus:border-indigo-500 focus:outline-none"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Make sure you have an account in Firebase Auth before signing in.
        </div>
      </div>
    </div>
  );
}
