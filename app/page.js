"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold mb-2">ChatX</h1>
        <p className="text-sm text-gray-500 mb-8">Fast, simple and reliable messaging</p>

        <div className="space-y-3">
          <Link href="/login" className="block w-full h-11 rounded-md bg-black text-white grid place-items-center">
            Sign in
          </Link>
          <Link href="/register" className="block w-full h-11 rounded-md border grid place-items-center">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
