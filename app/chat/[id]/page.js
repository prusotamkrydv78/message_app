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
      className="flex-1 resize-none rounded-md border bg-transparent px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
    />
  );
}

function Header({ title, phone }) {
  return (
    <header className="sticky top-0 z-10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="h-12 px-2 flex items-center gap-2">
        <Link href="/chat" className="size-10 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-gray-200 grid place-items-center text-xs font-medium">
            {title?.[0] || "U"}
          </div>
          <div className="leading-tight">
            <div className="font-medium text-[13px] truncate max-w-[48vw] sm:max-w-none">{title}</div>
            <div className="text-[11px] text-gray-500 truncate">{phone}</div>
          </div>
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

function Message({ mine, text, time, compact }) {
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${compact ? "-mt-0.5" : "mt-1"}`}>
      <div
        className={`${mine ? "bg-black text-white msg-in-right" : "bg-gray-100 msg-in-left"} max-w-[75%] rounded-2xl px-3 py-1.5 text-[14px] leading-relaxed shadow-sm`}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-gray-500"}`}>{time}</div>}
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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000;
    }
  }, [messages]);

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
    <div className="flex-1 flex flex-col">
      <Header title={title} phone={phone} />

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-2 py-2 space-y-1">
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
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="p-2 border-t flex items-end gap-2 bg-background"
      >
        <button type="button" className="size-9 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Attach">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 11-7.78-7.78l8.49-8.49a3.5 3.5 0 114.95 4.95l-8.49 8.49a1.5 1.5 0 11-2.12-2.12l7.78-7.78"/></svg>
        </button>
        <AutoGrowTextarea
          value={input}
          onChange={setInput}
          placeholder="Type a message"
          onSend={send}
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-black text-white disabled:opacity-60 active:scale-95 transition-transform"
          disabled={!input.trim()}
          aria-label="Send"
        >
          Send
        </button>
      </form>
    </div>
  );
}
