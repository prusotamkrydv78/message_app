"use client";
import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t">
      <div className="h-16 px-6 flex items-center justify-between">
        <Link href="/chat" className="size-10 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Home">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>
        </Link>
        <Link href="/chat/new" className="px-5 h-10 rounded-full bg-black text-white grid place-items-center text-[14px] font-medium shadow" aria-label="New Chat">
          + New Chat
        </Link>
        <Link href="/profile" className="size-10 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Profile">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </Link>
      </div>
    </nav>
  );
}
