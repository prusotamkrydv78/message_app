"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import EmojiPicker from "emoji-picker-react";
import { getSocket } from "../../../lib/socket";
import { CallManager } from "../../../lib/webrtc";
import CallModal from "../../../components/ui/call-modal";
import { AnimatePresence, motion } from "framer-motion";

function AutoGrowTextarea({ value, onChange, placeholder, onSend, onBlur }) {
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
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="flex-1 resize-none rounded-full px-4 py-2 bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-black/10"
    />
  );
}

function Header({ title, phone, elevated, callManager, callState, otherId, isOnline }) {
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
            <div className={`text-[12px] ${isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>{isOnline ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Video call">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="3" y="7" width="12" height="10" rx="2"/></svg>
          </button>
          <button 
            onClick={() => callManager?.startCall(otherId)}
            disabled={!!callState}
            className="size-9 grid place-items-center rounded-full hover:bg-gray-50 disabled:opacity-50" 
            aria-label="Voice call"
          >
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

function Tick({ state }) {
  // state: 'sending' | 'sent' | 'seen'
  if (state === 'seen') {
    return (
      <svg className="inline-block ml-1 size-3 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6 17.4l-3.8-3.8 1.2-1.2 2.6 2.6 6.2-6.2 1.2 1.2z"/><path d="M7.6 17.4L3.8 13.6l1.2-1.2 2.6 2.6 0 0 0 0"/></svg>
    );
  }
  if (state === 'sent') {
    return (
      <svg className="inline-block ml-1 size-3 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9.6 17.4l-3.8-3.8 1.2-1.2 2.6 2.6 6.2-6.2 1.2 1.2z"/></svg>
    );
  }
  return (
    <svg className="inline-block ml-1 size-3 text-gray-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/></svg>
  );
}

function Message({ mine, text, time, compact, tail, status }) {
  const containerGap = compact ? "-mt-1" : "mt-2";
  // detect emoji-only
  const clean = (text || '').trim();
  const emojiMatches = clean.match(/\p{Extended_Pictographic}/gu) || [];
  const isEmojiOnly = clean.length > 0 && emojiMatches.length > 0 && clean.replace(/\p{Extended_Pictographic}|\p{Emoji_Component}|\u200D|\uFE0F/gu, '').trim().length === 0;
  const emojiCount = emojiMatches.length;

  if (isEmojiOnly) {
    const sizeClass = emojiCount <= 3 ? 'text-5xl' : 'text-2xl';
    return (
      <div className={`w-full flex ${mine ? 'justify-end' : 'justify-start'} ${containerGap}`}>
        <div className={`relative max-w-[76%] px-1 py-1 ${mine ? 'msg-in-right' : 'msg-in-left'}`}>
          <div className={`leading-none ${sizeClass}`} style={{ lineHeight: 1 }}>
            {clean}
          </div>
          {!!time && <div className={`text-[10px] mt-1 ${mine ? 'text-gray-500' : 'text-gray-500'}`}>{time}</div>}
        </div>
      </div>
    );
  }

  const baseBubble = "max-w-[76%] rounded-2xl px-3 py-2 text-[14px] leading-relaxed";
  const shadow = compact ? "shadow-none" : mine ? "shadow-[0_6px_18px_rgba(0,0,0,0.10)]" : "shadow-[0_4px_14px_rgba(0,0,0,0.08)]";
  const colors = mine ? "bg-[#FFC93A] text-black msg-in-right" : "bg-white msg-in-left";
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap}`}>
      <div className={`relative ${baseBubble} ${colors} ${shadow}`}>
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && (
          <div className={`text-[10px] mt-1 flex items-center ${mine ? "text-black/70" : "text-gray-500"}`}>
            <span>{time}</span>
            {mine && <Tick state={status} />}
          </div>
        )}
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
  const { user, loading, accessToken } = useAuth();

  const title = searchParams.get("name") || "User";
  const phone = searchParams.get("phone") || "";
  const otherId = searchParams.get("otherId") || "";

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const typingClearRef = useRef(null);
  const [messages, setMessages] = useState([]); // each: {id, mine, text, ts, status}
  const socketRef = useRef(null);
  const seenRef = useRef(new Set()); // tracks _id or clientId to prevent duplicates
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [callManager, setCallManager] = useState(null);
  const [callState, setCallState] = useState(null); // { type, otherId, status, callerName }
  const remoteAudioRef = useRef(null);
  const [isOnline, setIsOnline] = useState(null);
  const typingEmitRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Detect coarse pointer devices (mobile) to hide emoji picker button
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = () => setIsMobile(!!mq.matches);
    handler();
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
    };
  }, []);

  // Fetch history
  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !otherId) return;
      try {
        const res = await api.messagesWith(accessToken, otherId);
        if (!active) return;
        const mapped = (res.messages || []).map((m, idx) => ({
          id: m._id || idx,
          mine: String(m.sender) === String(user?.id),
          text: m.text,
          ts: new Date(m.createdAt).getTime(),
          status: String(m.sender) === String(user?.id) ? 'sent' : undefined,
        }));
        setMessages(mapped);
      } catch {}
    })();
    return () => { active = false; };
  }, [accessToken, otherId, user?.id]);

  // Initialize call manager
  useEffect(() => {
    if (!accessToken || !user?.id) return;
    const s = getSocket(accessToken);
    const cm = new CallManager(s, user.id);
    
    cm.onIncomingCall = (from, offer) => {
      setCallState({ 
        type: 'incoming', 
        otherId: from, 
        status: 'ringing', 
        callerName: from === otherId ? title : 'Unknown',
        offer 
      });
    };
    
    cm.onCallStateChange = (status) => {
      // If status transitions to calling and we don't yet have state, initialize as outgoing
      setCallState(prev => prev ? { ...prev, status } : { type: 'outgoing', otherId, status, callerName: title });
      if (status === 'connected' && cm.remoteStream) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = cm.remoteStream;
        }
      }
      if (status === 'ended' || status === 'declined') {
        setCallState(null);
      }
    };
    
    cm.onCallError = (error) => {
      console.error('Call error:', error);
      setCallState(null);
    };
    
    setCallManager(cm);
    return () => {
      cm.endCall();
    };
  }, [accessToken, user?.id, otherId, title]);

  // Emit typing on change (immediate true) with debounce to false
  const handleInputChange = (val) => {
    setInput(val);
    const s = socketRef.current;
    if (!s || !otherId) return;
    s.emit('typing', { to: otherId, isTyping: true });
    if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
    typingEmitRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { to: otherId, isTyping: false });
      typingEmitRef.current = null;
    }, 1200);
  };

  // Socket connect
  useEffect(() => {
    if (!accessToken || !otherId) return;
    const s = getSocket(accessToken);
    socketRef.current = s;
    // request presence for header indicator
    s.emit('presence_request', { userId: otherId });
    const onPresence = ({ userId: uid, status }) => {
      if (String(uid) === String(otherId)) setIsOnline(status === 'online');
    };
    s.on('presence_update', onPresence);
    s.on("receive_message", (msg) => {
      // Only append if it's part of this chat
      const involves = [msg.sender, msg.recipient].map(String);
      if (involves.includes(String(user?.id)) && involves.includes(String(otherId))) {
        const key = String(msg.clientId || msg._id);
        if (seenRef.current.has(key)) return; // already handled
        seenRef.current.add(key);
        setMessages((prev) => {
          // Reconcile optimistic message if clientId matches
          if (msg.clientId) {
            const idx = prev.findIndex((m) => m.clientId && String(m.clientId) === String(msg.clientId));
            if (idx !== -1) {
              const clone = prev.slice();
              clone[idx] = { id: msg._id, clientId: msg.clientId, mine: true, text: msg.text, ts: new Date(msg.createdAt).getTime(), status: 'sent' };
              return clone;
            }
          }
          const mine = String(msg.sender) === String(user?.id);
          return [
            ...prev,
            { id: msg._id, clientId: msg.clientId, mine, text: msg.text, ts: new Date(msg.createdAt).getTime(), status: mine ? 'sent' : undefined },
          ];
        });

        // Mark seen immediately if I received a message in open chat
        if (String(msg.recipient) === String(user?.id)) {
          s.emit('mark_seen', { otherId: msg.sender, ids: [msg._id] });
        }
      }
    });

    // Update seen status for my outgoing messages
    s.on('messages_seen', ({ by, ids = [] }) => {
      if (String(by) !== String(otherId)) return;
      setMessages((prev) => prev.map(m => (ids.includes(m.id) ? { ...m, status: 'seen' } : m)));
    });
    s.on("typing", ({ from, isTyping }) => {
      if (String(from) !== String(otherId)) return;
      if (typingClearRef.current) {
        clearTimeout(typingClearRef.current);
        typingClearRef.current = null;
      }
      if (isTyping) {
        setTyping(true);
        // keep indicator visible at least ~1.8s after last "true"
        typingClearRef.current = setTimeout(() => {
          setTyping(false);
          typingClearRef.current = null;
        }, 1800);
        // nudge scroll to bottom so indicator is visible
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000;
        }
      } else {
        setTyping(false);
      }
    });
    return () => {
      if (s) {
        s.off("receive_message");
        s.off("typing");
        s.off('messages_seen');
        s.off('presence_update', onPresence);
      }
      if (typingClearRef.current) {
        clearTimeout(typingClearRef.current);
        typingClearRef.current = null;
      }
    };
  }, [accessToken, otherId, user?.id]);
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
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    seenRef.current.add(clientId);
    setMessages((prev) => [ ...prev, { id: clientId, clientId, mine: true, text, ts: Date.now(), status: 'sending' } ]);
    // emit via socket
    if (socketRef.current) {
      socketRef.current.emit("send_message", { to: otherId, text, clientId });
    }
    setInput("");
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
      <Header title={title} phone={phone} elevated={headerElevated} callManager={callManager} callState={callState} otherId={otherId} isOnline={isOnline} />

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll no-scrollbar px-3 py-2 pb-28 max-h-[calc(100vh-128px)] space-y-1">
        <AnimatePresence initial={false}>
          {groups.map((g, idx) => {
            if (g.type === "divider") return <DayDivider key={g.key} label={g.label} />;
            const prev = groups[idx - 1];
            const compact = prev && prev.type === "message" && prev.m.mine === g.m.mine;
            return (
              <motion.div
                key={g.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                layout
              >
                <Message
                  mine={g.m.mine}
                  text={g.m.text}
                  time={g.m.isLastInGroup ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(g.m.ts) : ""}
                  compact={compact}
                  tail={g.m.isLastInGroup}
                  status={g.m.status}
                />
              </motion.div>
            );
          })}
          <AnimatePresence>
            {typing && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="w-full flex justify-start"
              >
                <div className="bg-gray-100 rounded-2xl px-2.5 py-1.5 shadow-sm inline-flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="size-1.5 bg-gray-500/70 rounded-full animate-bounce"></span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatePresence>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="sticky bottom-0 z-10 p-2.5 flex items-center gap-2 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        {/* Desktop-only Emoji button */}
        {!isMobile && (
          <div className="relative">
            <button type="button" onClick={() => setShowEmojis((v) => !v)} className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Emoji picker">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 20a8 8 0 100-16 8 8 0 000 16zm-3-6s1 2 3 2 3-2 3-2M9 9h.01M15 9h.01"/></svg>
            </button>
            {showEmojis && (
              <div className="absolute bottom-12 left-0 z-20 w-[300px] bg-white border rounded-xl shadow-lg overflow-hidden" onMouseLeave={() => setShowEmojis(false)}>
                <EmojiPicker
                  onEmojiClick={(emojiData) => { setInput((prev) => `${prev}${emojiData.emoji}`); }}
                  autoFocusSearch={false}
                  searchDisabled
                  skinTonesDisabled
                  lazyLoadEmojis
                  width={300}
                  height={360}
                  previewConfig={{ showPreview: false }}
                  theme="light"
                />
              </div>
            )}
          </div>
        )}
        <button type="button" className="size-9 grid place-items-center rounded-full hover:bg-gray-50" aria-label="Attach">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-8.49 8.49a3.5 3.5 0 114.95 4.95l-8.49 8.49a1.5 1.5 0 11-2.12-2.12l7.78-7.78"/></svg>
        </button>
        <AutoGrowTextarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message"
          onSend={send}
          onBlur={() => socketRef.current?.emit('typing', { to: otherId, isTyping: false })}
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

      {/* Call Modal */}
      <CallModal
        isOpen={!!callState}
        type={callState?.type}
        callerName={callState?.callerName}
        status={callState?.status}
        onAnswer={() => callManager?.answerCall(callState?.offer)}
        onDecline={() => callManager?.declineCall()}
        onEndCall={() => callManager?.endCall()}
        onToggleMute={() => callManager?.toggleMute()}
      />

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
}
