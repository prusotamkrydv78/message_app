"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import Card from "../../../components/ui/card";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login({ phoneNumber, password });
      await refreshSession();
      router.replace("/chat");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 grid place-items-center py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto size-10 rounded-lg bg-black mb-2" />
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to continue chatting</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-[13px] text-gray-700 mb-1">Phone number</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3"/></svg>
              </span>
              <input
                className="w-full h-11 pl-9 pr-3 rounded-md border bg-white/90 focus:outline-none focus:ring-2 focus:ring-black/10"
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 9800000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-[13px] text-gray-700 mb-1">Password</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 11c.943 0 1.714-.771 1.714-1.714S12.943 7.571 12 7.571 10.286 8.343 10.286 9.286 11.057 11 12 11zm0 0v4.286"/></svg>
              </span>
              <input
                className="w-full h-11 pl-9 pr-10 rounded-md border bg-white/90 focus:outline-none focus:ring-2 focus:ring-black/10"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-md hover:bg-gray-100" aria-label="Toggle password visibility">
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0112 9a3 3 0 013 3c0 .42-.09.81-.25 1.17M21 12c-2.5 4-6 6-9 6-2.03 0-3.94-.73-5.58-1.96m-2.5-2.26C2.79 12.77 2 12 2 12c2.5-4 6-6 9-6 1.07 0 2.1.18 3.08.5"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zm11 3a3 3 0 100-6 3 3 0 000 6z"/></svg>
                )}
              </button>
            </div>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Don&apos;t have an account? <Link className="underline" href="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
