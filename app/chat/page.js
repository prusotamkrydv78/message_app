"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import Link from "next/link";
import { api } from "../../lib/api";
import FAB from "../../components/ui/fab";
import Avatar from "../../components/ui/avatar";
import BottomNav from "../../components/ui/bottom-nav";

function TopBar({ onLogout }) {
  const { user } = useAuth();
  return (
    <header className="px-4 py-3 flex items-center justify-between">
      <div className="text-[22px] font-bold tracking-tight">Mengobrol</div>
      <button className="size-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Search">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
      </button>
    </header>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, logout, accessToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!accessToken) return;
      setLoadingList(true);
      try {
        const res = await api.conversations(accessToken);
        if (!abort) setConversations(res.conversations || []);
      } catch (e) {
        if (!abort) setConversations([]);
      } finally {
        if (!abort) setLoadingList(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [accessToken]);

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  // Derive a small set for stories (mocked from conversations' other users)
  const storyUsers = conversations.slice(0, 8).map((c) => c.otherUser).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col">
      <TopBar onLogout={logout} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Stories */}
        <section className="px-4 pt-1 pb-3">
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Link href="/chat/new" className="shrink-0 flex flex-col items-center gap-2">
              <div className="size-14 rounded-full border-2 border-dashed border-gray-300 grid place-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-6"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-[11px] text-gray-600 font-medium">Add story</span>
            </Link>
            {storyUsers.map((u, idx) => (
              <div key={u.id || idx} className="shrink-0 flex flex-col items-center gap-2">
                <div className="size-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                  <Avatar name={u.name || u.phoneNumber} size={52} className="border-2 border-white" />
                </div>
                <span className="text-[11px] text-gray-700 max-w-[64px] truncate font-medium">{u.name || u.phoneNumber?.slice(-4)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Chats heading */}
        <div className="px-4 mt-2 mb-1 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Chats</h3>
          <button className="size-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="More">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M12 6.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM12 13.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM12 19.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>
          </button>
        </div>

        {/* Chats list */}
        <div>
          {loadingList && (
            <div className="p-4 text-sm text-gray-500">Loading conversations...</div>
          )}
          {!loadingList && conversations.map((c) => {
            const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
            const phone = `${c.otherUser?.countryCode || ''} ${c.otherUser?.phoneNumber || ''}`.trim();
            const href = `/chat/${c.id}?name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`;
            const time = c.lastMessage?.at ? new Date(c.lastMessage.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <Link href={href} key={c.id} className="block px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar name={title} size={50} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-semibold text-[15px] truncate">{title}</div>
                      <div className="text-[12px] text-gray-500 ml-2 shrink-0">{time}</div>
                    </div>
                    <div className="text-[14px] text-gray-600 truncate">{c.lastMessage?.text || 'No messages yet'}</div>
                  </div>
                  {c.lastMessage?.text && (
                    <span className="ml-2 inline-grid place-items-center size-5 rounded-full bg-yellow-400 text-black text-[11px] font-bold">2</span>
                  )}
                </div>
              </Link>
            );
          })}
          {!loadingList && conversations.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No chats yet. Start a conversation!</div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
