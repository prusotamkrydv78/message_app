"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { getSocket } from "../lib/socket";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useToast } from "./ui/use-toast";

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
  const { toast } = useToast();
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
      // Detect if user is anywhere in the chat experience (/chat list or /chat/[id])
      let isInChatArea = false;
      let isInThisChat = false;
      if (typeof window !== 'undefined') {
        isInChatArea = pathname.startsWith('/chat');
        if (pathname.startsWith('/chat/')) {
          const sp = new URLSearchParams(window.location.search);
          isInThisChat = sp.get('otherId') === otherId;
        }
      }
      // Broadcast event so any list pages can refresh
      window.dispatchEvent(new CustomEvent("chat:new-message", { detail: { otherId, msg, isInThisChat } }));
      // Show notification only if app is hidden or user is outside chat routes
      const shouldNotify = document.visibilityState === "hidden" || !isInChatArea;
      if (shouldNotify) {
        if (canNotify()) {
          try {
            new Notification("New message", { body: msg.text || "New message received" });
          } catch {}
        }
        // Shadcn toast (in-app)
        try {
          toast({ title: "New message", description: msg.text || "You received a new message" });
        } catch {}
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
      // No popup UI for requests; we only trigger refresh below
      // Notify any chat list views to refresh
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat:refresh-conversations', { detail: { reason: 'request', conversationId: payload.id } }));
        }
      } catch {}
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
      // Ask lists to refresh
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat:refresh-conversations', { detail: { reason: 'accepted', conversationId: payload.id } }));
        }
      } catch {}
      // Auto-navigate requester to the chat
      try {
        const ou = payload.otherUser || {};
        const title = ou.name || `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
        const phone = `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
        router.push(`/chat/${encodeURIComponent(payload.id)}?otherId=${encodeURIComponent(ou.id || '')}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`);
      } catch {}
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
      {toasts.map((t) => {
        if (t.type === 'request') return null; // we don't render request popups anymore
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
