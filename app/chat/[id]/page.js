"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";

function AutoGrowTextarea({ value, onChange, placeholder, onSend }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + "px";
  }, [value]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="flex-1 resize-none rounded-full px-4 py-2 bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-black/10"
    />
  );
}

function Header({ title, phone, elevated }) {
  return (
    <header className={`sticky top-0 z-10 bg-white/95 backdrop-blur ${elevated ? 'shadow-md' : ''}`}>
      <div className="h-14 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="size-10 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="size-9 rounded-full bg-gray-200 grid place-items-center text-xs font-medium">
            {title?.[0] || "U"}
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[15px] truncate max-w-[40vw] sm:max-w-none">{title}</div>
            <div className="text-[12px] text-emerald-600">Online</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Video call">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="3" y="7" width="12" height="10" rx="2"/></svg>
          </button>
          <button className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Voice call">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0122 16.92z"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function DayDivider({ label }) {
  return (
    <div className="py-1 grid place-items-center">
      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{label}</span>
    </div>
  );
}

function Message({ mine, text, time, compact, tail }) {
  const containerGap = compact ? "-mt-1" : "mt-2";
  const baseBubble = "max-w-[76%] rounded-2xl px-3 py-2 text-[14px] leading-relaxed";
  const shadow = compact ? "shadow-none" : mine ? "shadow-[0_6px_18px_rgba(0,0,0,0.10)]" : "shadow-[0_4px_14px_rgba(0,0,0,0.08)]";
  const colors = mine ? "bg-[#FFC93A] text-black msg-in-right" : "bg-white msg-in-left";
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap}`}>
      <div className={`relative ${baseBubble} ${colors} ${shadow}`}>
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && <div className={`text-[10px] mt-1 ${mine ? "text-black/70" : "text-gray-500"}`}>{time}</div>}
        {tail && (
          <span
            className={`absolute bottom-0 ${mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'} translate-y-1 w-3 h-3 rounded-bl-[10px] rounded-tr-[10px] ${mine ? 'bg-[#FFC93A]' : 'bg-white'} ${compact ? 'opacity-0' : 'opacity-100'} shadow-[inherit]`}
          />
        )}
      </div>
    </div>
  );
}

export default function ConversationPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const title = searchParams.get("name") || "User";
  const phone = searchParams.get("phone") || "";

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => {
    // initial sample thread
    return [
      { id: 1, mine: false, text: "Hi there!", ts: Date.now() - 1000 * 60 * 60 },
      { id: 2, mine: true, text: "Hello 👋", ts: Date.now() - 1000 * 60 * 58 },
      { id: 3, mine: false, text: "How's it going?", ts: Date.now() - 1000 * 60 * 45 },
    ];
  });
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000;
    }
  }, [messages]);

  // Track scroll to toggle header elevation and composer visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(distanceFromBottom < 8);
      setHeaderElevated(el.scrollTop > 2);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, mine: true, text, ts: Date.now() },
    ]);
    setInput("");
    // Simulate the other user replying with a small delay and typing indicator
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: prev.length + 1, mine: false, text: "Got it! 👍", ts: Date.now() },
      ]);
      setTyping(false);
    }, 800);
  };

  const groups = useMemo(() => {
    // Group by day for divider
    const fmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });
    const out = [];
    let lastDay = "";
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const day = fmt.format(m.ts);
      if (day !== lastDay) {
        out.push({ type: "divider", key: `d-${day}-${m.id || out.length}`, label: day });
        lastDay = day;
      }
      // Determine if next message is from same sender
      const next = messages[i + 1];
      const isLastInGroup = !next || next.mine !== m.mine;
      out.push({ type: "message", key: `m-${m.id}`, m: { ...m, isLastInGroup } });
    }
    return out;
  }, [messages]);

  if (loading || !user) return null;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header title={title} phone={phone} elevated={headerElevated} />

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll no-scrollbar px-3 py-2 pb-28 space-y-1">
        {groups.map((g, idx) => {
          if (g.type === "divider") return <DayDivider key={g.key} label={g.label} />;
          const prev = groups[idx - 1];
          const compact = prev && prev.type === "message" && prev.m.mine === g.m.mine;
          return (
            <Message
              key={g.key}
              mine={g.m.mine}
              text={g.m.text}
              time={g.m.isLastInGroup ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(g.m.ts) : ""}
              compact={compact}
              tail={g.m.isLastInGroup}
            />
          );
        })}
        {typing && (
          <div className="w-full flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-2.5 py-1.5 shadow-sm inline-flex items-center gap-2">
              <span className="text-[13px] text-gray-600">Typing</span>
              <span className="inline-flex gap-1">
                <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
        {/* Delivered indicator (last outgoing) */}
        {(() => {
          const last = messages[messages.length - 1];
          if (last && last.mine) {
            return <div className="w-full flex justify-end pr-2"><span className="text-[12px] text-gray-500">Delivered</span></div>;
          }
          return null;
        })()}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="sticky bottom-0 z-10 p-2.5 flex items-center gap-2 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        <button type="button" className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Attach">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-8.49 8.49a3.5 3.5 0 114.95 4.95l-8.49 8.49a1.5 1.5 0 11-2.12-2.12l7.78-7.78"/></svg>
        </button>
        <AutoGrowTextarea
          value={input}
          onChange={setInput}
          placeholder="Type a message"
          onSend={send}
        />
        <button
          type="submit"
          className={`size-10 grid place-items-center rounded-full text-white active:scale-95 transition-transform ${input.trim() ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!input.trim()}
          aria-label="Send"
          title="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
            <path d="M3.4 2.6a1 1 0 00-1.3 1.28l3.07 8.2a1 1 0 01.02.63l-3.07 8.2A1 1 0 003.4 22l17.96-8.51a1 1 0 000-1.98L3.4 2.6zm5.43 8.22L6 6.3l9.74 4.19-6.91.33z" />
          </svg>
        </button>
      </form>

      {/* Scroll-to-bottom button when not at bottom */}
      {!atBottom && (
        <button
          onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000; }}
          className="absolute right-4 bottom-20 size-10 rounded-full bg-black text-white grid place-items-center shadow-md active:scale-95"
          aria-label="Scroll to bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6"/></svg>
        </button>
      )}
    </div>
  );
}
