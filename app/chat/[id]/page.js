"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, Smile, Paperclip, Send, ChevronDown, MoreVertical } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import EmojiPicker from "emoji-picker-react";
import { getSocket } from "../../../lib/socket";
import { CallManager } from "../../../lib/webrtc";
import CallModal from "../../../components/ui/call-modal";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { ScrollArea } from "../../../components/ui/scroll-area";

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
      className="flex-1 resize-none rounded-2xl px-4 py-3 bg-white border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
    />
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
            disabled={callState !== 'idle'}
          >
            <Phone className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => callManager?.startCall(otherId, true)}
            disabled={callState !== 'idle'}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <Header title={title} phone={phone} elevated={headerElevated} callManager={callManager} callState={callState} otherId={otherId} isOnline={isOnline} />

      {/* Messages list */}
      <ScrollArea className="flex-1 px-4 py-2">
        <div ref={scrollRef} className="space-y-1 pb-4">
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
          </AnimatePresence>
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
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000; }}
            size="icon"
            className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm border shadow-lg hover:shadow-xl text-foreground hover:bg-white"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </motion.div>
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
