"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, Smile, Paperclip, Send, ChevronDown, MoreVertical } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import EmojiPicker from "emoji-picker-react";
// Defer heavy/possibly cyclic modules
const CallModal = dynamic(() => import("../../../components/ui/call-modal"), { ssr: false });
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { ScrollArea } from "../../../components/ui/scroll-area";

function AutoGrowTextarea({ value, onChange, placeholder, onSend, onBlur, inputRef }) {
  const inner = useRef(null);
  const ref = inputRef || inner;
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
      className="flex-1 resize-none rounded-full px-4 py-2 bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors shadow-sm"
    />
  );
}

// Coalesce duplicate/near-duplicate call entries
function coalesceCallItems(items) {
  const out = [];
  const windowMs = 60 * 1000; // 60s window to consider duplicates
  const precedence = { ended: 3, declined: 2, missed: 1 };
  for (const it of items) {
    if (it.type !== 'call') { out.push(it); continue; }
    // find last call within window with same direction/isVideo
    const last = out.length ? out[out.length - 1] : null;
    if (
      last && last.type === 'call' &&
      Math.abs(last.ts - it.ts) <= windowMs &&
      last.direction === it.direction &&
      last.isVideo === it.isVideo
    ) {
      // merge: keep highest outcome precedence and max duration; prefer latest time stamp
      const keep = { ...last };
      if ((precedence[it.outcome] || 0) > (precedence[last.outcome] || 0)) keep.outcome = it.outcome;
      keep.durationSec = Math.max(keep.durationSec || 0, it.durationSec || 0);
      keep.ts = Math.max(keep.ts, it.ts);
      out[out.length - 1] = keep;
    } else {
      out.push(it);
    }
  }
  return out;
}

function CallEntry({ direction, isVideo, outcome, durationSec, time }) {
  const Icon = isVideo ? Video : Phone;
  const base = direction === 'outgoing' ? 'You started a' : 'Incoming';
  const kind = isVideo ? 'video call' : 'voice call';
  const status = outcome === 'ended' && durationSec > 0
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
    : outcome === 'declined'
      ? 'Declined'
      : 'Missed';
  return (
    <div className="w-full flex justify-center my-2">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-xs text-muted-foreground shadow-sm">
        <Icon className="h-3.5 w-3.5" />
        <span>{base} {kind}</span>
        <span className="opacity-70">•</span>
        <span className="font-medium">{status}</span>
        {!!time && (
          <span className="opacity-70">• {time}</span>
        )}
      </div>
    </div>
  );
}

function Header({ title, phone, elevated, callManager, callState, otherId, isOnline }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b transition-shadow duration-200 ${elevated ? 'shadow-lg' : ''}`}
    >
      <div className="h-16 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
                  {getInitials(title)}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate">{title}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {isOnline ? "Online" : phone || "Offline"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => callManager?.startCall(otherId, false)}
            disabled={['calling','ringing','connected'].includes(callState)}
          >
            <Phone className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => callManager?.startCall(otherId, true)}
            disabled={['calling','ringing','connected'].includes(callState)}
          >
            <Video className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

function DayDivider({ label }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-2 flex justify-center"
    >
      <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border shadow-sm">
        {label}
      </span>
    </motion.div>
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
        <div className="relative max-w-[76%] px-1 py-1">
          <div className={`leading-none ${sizeClass}`} style={{ lineHeight: 1 }}>
            {clean}
          </div>
          {!!time && <div className="text-xs mt-1 text-muted-foreground text-center">{time}</div>}
        </div>
      </div>
    );
  }

  const baseBubble = "max-w-[76%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed";
  const shadow = compact ? "shadow-none" : "shadow-sm";
  const colors = mine 
    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
    : "bg-white border text-foreground";
  
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap}`}>
      <div className={`relative ${baseBubble} ${colors} ${shadow} transition-all duration-200 hover:shadow-md`}>
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && (
          <div className={`text-xs mt-1.5 flex items-center ${mine ? "text-white/80" : "text-muted-foreground"}`}>
            <span>{time}</span>
            {mine && <Tick state={status} />}
          </div>
        )}
        {tail && !compact && (
          <span
            className={`absolute bottom-0 ${mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'} translate-y-1 w-3 h-3 ${mine ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-white border-l border-b'} transform rotate-45`}
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
  const viewportRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [callManager, setCallManager] = useState(null);
  const [callState, setCallState] = useState(null); // { type, otherId, status, callerName }
  const remoteAudioRef = useRef(null);
  const composerRef = useRef(null);
  const [isOnline, setIsOnline] = useState(null);
  const typingEmitRef = useRef(null);
  const callMetaRef = useRef({ direction: null, isVideo: false, startedAt: null, connected: false, logged: false });
  const lastPersistRef = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Focus the input when entering the chat
  useEffect(() => {
    if (composerRef.current) {
      // slight delay to ensure layout is ready
      const t = setTimeout(() => composerRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [composerRef]);

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
        const callsRes = await api.callsWith(accessToken, otherId).catch(() => ({ calls: [] }));
        if (!active) return;
        const mapped = (res.messages || []).map((m, idx) => ({
          id: m._id || idx,
          mine: String(m.sender) === String(user?.id),
          text: m.text,
          ts: new Date(m.createdAt).getTime(),
          status: String(m.sender) === String(user?.id) ? 'sent' : undefined,
        }));
        const callMapped = (callsRes.calls || []).map((c) => ({
          id: c._id,
          type: 'call',
          ts: new Date(c.startedAt || c.createdAt || c.updatedAt || Date.now()).getTime(),
          direction: String(c.caller) === String(user?.id) ? 'outgoing' : 'incoming',
          isVideo: c.type === 'video',
          outcome: c.status === 'answered' || c.status === 'ended' ? 'ended' : c.status, // normalize
          durationSec: Number(c.duration || 0),
        }));
        const mergedRaw = [...mapped, ...callMapped].sort((a, b) => a.ts - b.ts);
        const merged = coalesceCallItems(mergedRaw);
        setMessages(merged);
      } catch {}
    })();
    return () => { active = false; };
  }, [accessToken, otherId, user?.id]);

  // Initialize call manager
  useEffect(() => {
    if (!accessToken || !user?.id) return;
    let cm;
    let mounted = true;
    (async () => {
      const { getSocket } = await import("../../../lib/socket");
      const { CallManager } = await import("../../../lib/webrtc");
      const s = getSocket(accessToken);
      cm = new CallManager(s, user.id);
    
    cm.onIncomingCall = (from, offer, isVideo) => {
      // Only show call modal if it's from the current chat partner
      if (String(from) === String(otherId)) {
        setCallState({ 
          type: 'incoming', 
          otherId: from, 
          status: 'ringing', 
          callerName: title,
          offer,
          isVideo: !!isVideo
        });
        // prime call meta for potential missed call
        callMetaRef.current = { direction: 'incoming', isVideo: !!isVideo, startedAt: Date.now(), connected: false, logged: false };
      }
    };
    
    cm.onCallStateChange = (status) => {
      setCallState(prev => {
        if (!prev && status === 'calling') {
          // Initialize outgoing call state
          return { 
            type: 'outgoing', 
            otherId, 
            status, 
            callerName: title,
            isVideo: cm.currentCall?.isVideo || false
          };
        }
        if (prev) {
          const newState = { ...prev, status };
          if (status === 'connected' && cm.remoteStream && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = cm.remoteStream;
            remoteAudioRef.current.play().catch(console.error);
          }
          // update call record meta
          if (status === 'calling') {
            callMetaRef.current = { direction: 'outgoing', isVideo: !!(cm.currentCall?.isVideo), startedAt: Date.now(), connected: false, logged: false };
          } else if (status === 'connected') {
            // mark connected so we can compute duration later
            callMetaRef.current = { ...callMetaRef.current, connected: true, startedAt: callMetaRef.current.startedAt || Date.now() };
          } else if (status === 'ended' || status === 'declined') {
            // create a call log entry message
            const meta = callMetaRef.current || {};
            const durationSec = meta.connected && meta.startedAt ? Math.max(0, Math.round((Date.now() - meta.startedAt) / 1000)) : 0;
            const outcome = status === 'ended' ? 'ended' : 'declined';
            const direction = meta.direction || (prev?.type === 'incoming' ? 'incoming' : 'outgoing');
            const isVideo = meta.isVideo || !!prev?.isVideo;
            const ts = Date.now();
            if (!meta.logged) {
              setMessages((prevMsgs) => coalesceCallItems([
                ...prevMsgs,
                { id: `call-${ts}`, type: 'call', ts, direction, isVideo, outcome: meta.connected ? outcome : (direction === 'incoming' && outcome === 'ended' ? 'ended' : outcome), durationSec }
              ]));
            }
            // persist to backend
            try {
              // Throttle persistence to avoid duplicate server records from multiple state transitions
              const now = Date.now();
              if (now - lastPersistRef.current < 3000) throw new Error('throttled');
              const payload = {
                recipient: direction === 'outgoing' ? otherId : user?.id,
                type: isVideo ? 'video' : 'voice',
                status: meta.connected ? (status === 'ended' ? 'ended' : 'declined') : (status === 'declined' ? 'declined' : 'missed'),
                duration: durationSec,
                startedAt: meta.startedAt || ts,
                endedAt: status === 'ended' ? ts : undefined,
              };
              api.createCall(accessToken, payload).catch(() => {});
              lastPersistRef.current = now;
            } catch {}
            callMetaRef.current = { direction: null, isVideo: false, startedAt: null, connected: false, logged: true };
            return null;
          }
          return newState;
        }
        return prev;
      });
    };
    
    cm.onCallError = (error) => {
      console.error('Call error:', error);
      setCallState(null);
    };
    
      if (!mounted) return;
      setCallManager(cm);
    })();
    return () => {
      mounted = false;
      if (cm?.currentCall) cm.endCall();
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
    let s;
    let cleanup;
    (async () => {
      const { getSocket } = await import("../../../lib/socket");
      s = getSocket(accessToken);
      socketRef.current = s;
      // request presence for header indicator
      s.emit('presence_request', { userId: otherId });
      // Clear unread counter for this conversation as we're viewing it
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chat:clear-unread', { detail: { otherId } }));
      }
      const onPresence = ({ userId: uid, status }) => {
        if (String(uid) === String(otherId)) setIsOnline(status === 'online');
      };
      s.on('presence_update', onPresence);

      s.on("receive_message", (msg) => {
        // Only handle if it's part of this chat
        const involves = [msg.sender, msg.recipient].map(String);
        if (!(involves.includes(String(user?.id)) && involves.includes(String(otherId)))) return;

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
        // Clear unread as message is visible in this open chat
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat:clear-unread', { detail: { otherId } }));
        }
      });

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
          if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight + 1000;
          }
        } else {
          setTyping(false);
        }
      });
      cleanup = () => {
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
    })();
    return () => cleanup?.();
  }, [accessToken, otherId, user?.id]);

  // Auto-scroll to bottom on mount and on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Track scroll to toggle header elevation and composer visibility
  useEffect(() => {
    const el = viewportRef.current;
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
    // keep input active after send
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const groups = useMemo(() => {
    // Group by day for divider
    const fmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });
    const out = [];
    let k = 0; // monotonic key counter to guarantee uniqueness
    let lastDay = "";
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const day = fmt.format(m.ts);
      if (day !== lastDay) {
        out.push({ type: "divider", key: `gk-${k++}`, label: day });
        lastDay = day;
      }
      if (m.type === 'call') {
        out.push({ type: 'call', key: `gk-${k++}`, m });
      } else {
        const next = messages[i + 1];
        const isLastInGroup = !next || next.mine !== m.mine;
        out.push({ type: "message", key: `gk-${k++}`, m: { ...m, isLastInGroup } });
      }
    }
    return out;
  }, [messages]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <Header
        title={title}
        phone={phone}
        elevated={headerElevated}
        callManager={callManager}
        callState={callState?.status || 'idle'}
        otherId={otherId}
        isOnline={isOnline}
      />

      {/* Messages list */}
      <ScrollArea ref={viewportRef} className="flex-1 px-4 py-2">
        <div className="space-y-1 pb-4">
          {groups.filter(g => g && g.type).map((g, idx) => {
            const uniqueKey = `item-${idx}-${g.type}-${g.m?.ts || Date.now()}`;
            if (g.type === "divider") return <DayDivider key={uniqueKey} label={g.label} />;
            if (g.type === 'call') {
              return (
                <motion.div key={uniqueKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <CallEntry
                    direction={g.m.direction}
                    isVideo={g.m.isVideo}
                    outcome={g.m.outcome}
                    durationSec={g.m.durationSec || 0}
                    time={new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(g.m.ts)}
                  />
                </motion.div>
              );
            }
            const prev = groups[idx - 1];
            const compact = prev && prev.type === "message" && prev.m.mine === g.m.mine;
            return (
              <motion.div
                key={uniqueKey}
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
            {typing && atBottom && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="w-full flex justify-start"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm inline-flex items-center gap-2 border">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="size-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="size-1.5 bg-muted-foreground/70 rounded-full animate-bounce"></span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky bottom-0 z-10 p-4 bg-white/95 backdrop-blur-md border-t"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-3 max-w-4xl mx-auto"
        >
          {/* Desktop-only Emoji button */}
          {!isMobile && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojis((v) => !v)}
                className="h-10 w-10"
              >
                <Smile className="h-5 w-5" />
              </Button>
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
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <AutoGrowTextarea
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              onSend={send}
              onBlur={() => socketRef.current?.emit('typing', { to: otherId, isTyping: false })}
              inputRef={composerRef}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            className={`h-10 w-10 rounded-full transition-all ${
              input.trim() 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            disabled={!input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </motion.div>

      {/* Scroll-to-bottom button when not at bottom */}
      {!atBottom && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed right-4 bottom-24 z-20"
        >
          <Button
            onClick={() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }}
            size="icon"
            className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm border shadow-lg hover:shadow-xl text-foreground hover:bg-white"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {/* Call UI */}
      {callState && (
        <CallModal
          isOpen={true}
          type={callState.type}
          callerName={title}
          status={callState.status}
          onAnswer={() => callManager?.answerCall(callState.offer)}
          onDecline={() => callManager?.declineCall()}
          onEndCall={() => callManager?.endCall()}
          onToggleMute={() => callManager?.toggleMute()}
          isVideo={!!callState.isVideo}
          localStream={callManager?.localStream || null}
          remoteStream={callManager?.remoteStream || null}
        />
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
}