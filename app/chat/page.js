"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import Link from "next/link";
import { api } from "../../lib/api";
import FAB from "../../components/ui/fab";

function TopBar({ onLogout }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="h-12 px-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-gray-200 grid place-items-center text-xs font-medium">
            {user?.name?.[0]?.toUpperCase() || user?.phoneNumber?.slice(-2) || "U"}
          </div>
          <div className="leading-tight">
            <div className="font-medium text-[13px]">{user?.name || "You"}</div>
            <div className="text-[11px] text-gray-500">{user?.countryCode} {user?.phoneNumber}</div>
          </div>
        </div>
        <button onClick={onLogout} className="text-[13px] px-3 py-1.5 rounded-md border">
          Logout
        </button>
      </div>
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

  return (
    <div className="flex-1 flex flex-col">
      <TopBar onLogout={logout} />
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr]">
        {/* Recent chats list: visible on all screens, takes full width on mobile */}
        <aside className="flex flex-col border-r min-h-[40dvh]">
          <div className="p-2.5 border-b">
            <input className="w-full h-9 px-3 rounded-md border bg-transparent text-[14px]" placeholder="Search" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {loadingList && (
              <div className="p-3 text-sm text-gray-500">Loading conversations...</div>
            )}
            {!loadingList && conversations.map((c) => {
              const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
              const phone = `${c.otherUser?.countryCode || ''} ${c.otherUser?.phoneNumber || ''}`.trim();
              const href = `/chat/${c.id}?name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`;
              return (
              <Link href={href} key={c.id} className="block p-2.5 hover:bg-gray-50 focus:bg-gray-50 outline-none">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-gray-200 grid place-items-center text-xs font-medium">
                    {c.otherUser?.name?.[0] || c.otherUser?.phoneNumber?.slice(-2) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate text-[14px]">{title}</div>
                      <div className="text-[11px] text-gray-500 ml-2 shrink-0">{c.lastMessage?.at ? new Date(c.lastMessage.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                    <div className="text-[13px] text-gray-500 truncate">{c.lastMessage?.text || 'No messages yet'}</div>
                  </div>
                </div>
              </Link>
              );})}
            {!loadingList && conversations.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No chats yet. Start a conversation!</div>
            )}
          </div>
        </aside>

        {/* Chat window (hidden on small screens until a chat is selected in future) */}
        <section className="hidden md:flex flex-col min-h-[60dvh]">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-center text-sm text-gray-500 mt-8">Select a conversation to start chatting</div>
          </div>
        </section>
      </main>

      {/* Floating Action Button to start new conversation */}
      <Link href="/chat/new" aria-label="Start new chat">
        <FAB />
      </Link>
    </div>
  );
}
