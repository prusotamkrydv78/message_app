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
    return () => { s.off && s.off("receive_message", handler); };
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
      {toasts.map((t) => (
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
      ))}
    </div>
  );
}
