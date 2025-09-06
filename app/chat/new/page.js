"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import BottomNav from "../../../components/ui/bottom-nav";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(false);
  const listRef = useRef(null);
  const [headerElevated, setHeaderElevated] = useState(false);
  
  // track scroll to add subtle shadow to header (must be before any early returns)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setHeaderElevated(el.scrollTop > 2);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Fetch users from backend (excluding current user)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!accessToken) return;
      setFetching(true);
      try {
        const res = await api.users(accessToken, q);
        if (!abort) setUsers(res.users || []);
      } catch (e) {
        if (!abort) setUsers([]);
      } finally {
        if (!abort) setFetching(false);
      }
    })();
    return () => { abort = true; };
  }, [accessToken, q]);

  const filtered = useMemo(() => {
    // users already filtered on server by q, but keep local fallback
    const s = q.toLowerCase().trim();
    if (!s) return users;
    return users.filter((c) =>
      (c.name || "").toLowerCase().includes(s) || (c.phoneNumber || "").includes(s)
    );
  }, [q, users]);

  const startChat = async (contact) => {
    try {
      const res = await api.startConversation(accessToken, contact.id || contact._id);
      // Navigate to chat list or conversation view when implemented
      router.replace("/chat");
    } catch (e) {
      alert(e.message || "Failed to start chat");
    }
  };

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <header className={`sticky top-0 z-10 bg-white/95 backdrop-blur ${headerElevated ? 'shadow-md' : ''}`}>
        <div className="h-14 px-4 flex items-center gap-2">
          <Link href="/chat" className="size-10 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="text-[16px] font-semibold">New Chat</div>
        </div>
      </header>

      <div className="p-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
          </span>
          <input
            className="w-full h-10 pl-9 pr-3 rounded-full bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Search by name or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {fetching && (
          <div className="p-4 text-sm text-gray-500">Loading users...</div>
        )}
        {!fetching && filtered.map((c, idx) => (
          <button
            key={c.id || c._id || idx}
            onClick={() => startChat(c)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                <div className="size-full rounded-full bg-white grid place-items-center text-sm font-medium">
                  {(c.name || `${c.countryCode} ${c.phoneNumber}`)[0]}
                </div>
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-semibold text-[15px] truncate">{c.name || `${c.countryCode} ${c.phoneNumber}`}</div>
                <div className="text-[13px] text-gray-600 truncate">{c.countryCode} {c.phoneNumber}</div>
              </div>
            </div>
          </button>
        ))}

        {!fetching && filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No contacts found.</div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
