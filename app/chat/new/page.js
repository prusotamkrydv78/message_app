"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(false);

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
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="h-14 px-2 flex items-center gap-2">
          <Link href="/chat" className="size-10 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="text-base font-medium">New chat</div>
        </div>
      </header>

      <div className="p-3 border-b">
        <input
          className="w-full h-10 px-3 rounded-md border bg-transparent"
          placeholder="Search by name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto divide-y">
        {fetching && (
          <div className="p-4 text-sm text-gray-500">Loading users...</div>
        )}
        {!fetching && filtered.map((c) => (
          <button
            key={c.id || c._id}
            onClick={() => startChat(c)}
            className="w-full text-left p-3 hover:bg-gray-50 focus:bg-gray-50 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gray-200 grid place-items-center text-sm font-medium">
                {(c.name || `${c.countryCode} ${c.phoneNumber}`)[0]}
              </div>
              <div className="leading-tight">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.countryCode} {c.phoneNumber}</div>
              </div>
            </div>
          </button>
        ))}

        {!fetching && filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No contacts found.</div>
        )}
      </div>
    </div>
  );
}
