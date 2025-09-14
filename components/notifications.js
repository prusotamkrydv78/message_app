"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { getSocket } from "../lib/socket";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";

function canNotify() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

async function ensurePermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    try { const p = await Notification.requestPermission(); return p === "granted"; } catch {}
  }
  return false;
}

// Simple one-shot ding using a short base64 WAV (44-byte header + a tiny beep)
const DING_SRC =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAAA//8AAP//AAD//wAA//8AAP//AAD//wAA";

function getMuted() {
  try { return localStorage.getItem('chatx_notify_muted') === '1'; } catch { return false; }
}

function getSoundSrc() {
  try { return localStorage.getItem('chatx_notify_sound') || DING_SRC; } catch { return DING_SRC; }
}

function playDing() {
  try {
    if (getMuted()) return;
    const a = new Audio(getSoundSrc());
    a.volume = 0.5;
    a.play().catch(() => {});
  } catch {}
}

export default function NotificationsProvider() {
  const { accessToken, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => { ensurePermission(); }, []);

  useEffect(() => {
    if (!accessToken || !user) return;
    const s = getSocket(accessToken);
    const handler = (msg) => {
      const involves = [String(msg.sender), String(msg.recipient)];
      if (!involves.includes(String(user.id))) return;
      const otherId = String(msg.sender) === String(user.id) ? String(msg.recipient) : String(msg.sender);
      // Only notify if I am the RECIPIENT (not when I am the sender and get echo)
      const iAmRecipient = String(msg.recipient) === String(user.id);
      if (!iAmRecipient) return;
      let isInThisChat = false;
      if (typeof window !== 'undefined') {
        const inChatRoute = pathname.startsWith('/chat/');
        const sp = new URLSearchParams(window.location.search);
        isInThisChat = inChatRoute && sp.get('otherId') === otherId;
      }
      // Broadcast event so any list pages can refresh
      window.dispatchEvent(new CustomEvent("chat:new-message", { detail: { otherId, msg, isInThisChat } }));
      // Show notification if not in that chat or tab hidden
      const shouldNotify = document.visibilityState === "hidden" || !isInThisChat;
      if (shouldNotify) {
        if (canNotify()) {
          try {
            new Notification("New message", { body: msg.text || "New message received" });
          } catch {}
        }
        // Sound
        playDing();
        // Badge count (compute next value within updater to avoid stale value)
        setUnread((u) => {
          const next = u + 1;
          if (typeof document !== 'undefined') {
            const base = "ChatX – Messaging App";
            document.title = `(${next}) ${base}`;
          }
          if (navigator.setAppBadge) {
            try { navigator.setAppBadge(next); } catch {}
          }
          return next;
        });
        // Also show in-app toast
        const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((prev) => [
          ...prev,
          { id: toastId, otherId, text: msg.text || "New message" },
        ]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 4000);
      }
    };
    s.on("receive_message", handler);

    // Incoming connection request
    const onRequest = (payload) => {
      // payload: { id, requestedBy, otherUser, createdAt }
      // Only show if I am the recipient (not the requester)
      if (!payload || String(payload.requestedBy) === String(user.id)) return;
      const title = payload.otherUser?.name || `${payload.otherUser?.countryCode || ''} ${payload.otherUser?.phoneNumber || ''}`.trim() || 'New request';
      const toastId = `req-${payload.id}-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          type: 'request',
          conversationId: payload.id,
          requester: payload.otherUser || null,
          title,
        },
      ]);
      // auto-dismiss after 12s if not interacted
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 12000);
    };
    s.on('conversation_request', onRequest);

    // Request accepted notification (for requester)
    const onAccepted = (payload) => {
      // payload: { id, acceptedAt, otherUser }
      const toastId = `acc-${payload.id}-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          type: 'accepted',
          conversationId: payload.id,
          otherUser: payload.otherUser || null,
          text: 'Your connection request was accepted',
        },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    };
    s.on('conversation_accepted', onAccepted);

    return () => {
      s.off && s.off("receive_message", handler);
      s.off && s.off('conversation_request', onRequest);
      s.off && s.off('conversation_accepted', onAccepted);
    };
  }, [accessToken, user, pathname]);

  // Reset badge when user focuses app or navigates into a chat
  useEffect(() => {
    const reset = () => {
      setUnread(0);
      if (navigator.clearAppBadge) { try { navigator.clearAppBadge(); } catch {} }
      if (typeof document !== 'undefined') {
        document.title = "ChatX – Messaging App";
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reset();
    };
    window.addEventListener('focus', reset);
    document.addEventListener('visibilitychange', handleVisibility);
    // Also reset when on any /chat route
    if (pathname.startsWith('/chat')) reset();
    return () => {
      window.removeEventListener('focus', reset);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center gap-2 p-3">
      {/* Requests list panel */}
      {toasts.some(t => t.type === 'request') && (
        <div className="pointer-events-auto w-full max-w-sm bg-white text-foreground border rounded-xl px-4 py-3 shadow-lg text-left self-end mr-0 sm:mr-2" style={{ marginTop: '4px' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Requests</div>
            <a href="/requests" className="text-xs text-primary hover:underline">View all</a>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {toasts.filter(t => t.type === 'request').map((t) => (
              <div key={t.id} className="border rounded-lg px-3 py-2">
                <div className="text-[13px] text-muted-foreground">Connection request</div>
                <div className="font-medium text-[14px] truncate mb-2">{t.title}</div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={async () => {
                      try { await api.deleteConversation(accessToken, t.conversationId); } catch {}
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-muted"
                  >
                    Decline
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.acceptConversation(accessToken, t.conversationId);
                        const ou = t.requester || {};
                        const title = ou.name || `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
                        const phone = `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
                        router.push(`/chat/${encodeURIComponent(t.conversationId)}?otherId=${encodeURIComponent(ou.id || '')}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`);
                      } catch {}
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toasts.map((t) => {
        if (t.type === 'request') {
          // Skip individual request cards since we render the grouped list panel above
          return null;
        }
        if (t.type === 'accepted') {
          return (
            <div
              key={t.id}
              className="pointer-events-auto w-full max-w-sm bg-black text-white rounded-xl px-4 py-3 shadow-lg text-left"
            >
              <div className="text-[13px] opacity-80">Request update</div>
              <div className="font-medium text-[14px] truncate">{t.text}</div>
            </div>
          );
        }
        // default: message toast
        return (
          <button
            key={t.id}
            onClick={async () => {
              try {
                // ensure conversation exists then navigate
                const res = await api.startConversation(accessToken, t.otherId);
                const convoId = res?.id;
                if (convoId) router.push(`/chat/${convoId}?otherId=${encodeURIComponent(t.otherId)}`);
                else router.push(`/chat`);
              } catch {
                router.push(`/chat`);
              }
            }}
            className="pointer-events-auto w-full max-w-sm bg-black text-white rounded-xl px-4 py-3 shadow-lg text-left active:scale-[0.99]"
          >
            <div className="text-[13px] opacity-80">New message</div>
            <div className="font-medium text-[14px] truncate">{t.text}</div>
          </button>
        );
      })}
    </div>
  );
}
