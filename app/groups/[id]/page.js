"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import { Button } from "../../../components/ui/button";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { useToast } from "../../../components/ui/use-toast";
import { Picker } from "emoji-picker-react";

function Tick({ state }) {
  if (state === "seen") {
    return (
      <svg className="inline-block ml-1 size-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l8.1-8.1 1.4 1.4z"/></svg>
    );
  }
  if (state === "sent") {
    return (
      <svg className="inline-block ml-1 size-3 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9.6 17.4l-3.8-3.8 1.2-1.2 2.6 2.6 6.2-6.2 1.2 1.2z"/></svg>
    );
  }
  if (state === "failed") {
    return (
      <svg className="inline-block ml-1 size-3 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1-7h2v6h-2V9z"/></svg>
    );
  }
  return (
    <svg className="inline-block ml-1 size-3 text-gray-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/></svg>
  );
}

function Message({ mine, text, time, compact, tail, status, onRetry }) {
  const containerGap = compact ? "-mt-1" : "mt-2";
  const baseBubble = compact ? "px-3 py-1.5 rounded-2xl max-w-[85%]" : "px-3.5 py-2.5 rounded-2xl max-w-[85%]";
  const shadow = compact ? "shadow-none" : "shadow-sm";
  const colors = mine ? "bg-gradient-to-r from-orange-500 to-red-600 text-white" : "bg-white border text-foreground";
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap}`}>
      <div className={`relative ${baseBubble} ${colors} ${shadow}`}>
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && (
          <div className={`text-xs mt-1.5 flex items-center gap-2 ${mine ? "text-white/80" : "text-muted-foreground"}`}>
            <span>{time}</span>
            {mine && <Tick state={status} />}
            {mine && status === 'failed' && (
              <button type="button" onClick={onRetry} className={`px-2 py-0.5 rounded border ${mine ? 'bg-white/10 text-white/90 border-white/30 hover:bg-white/20' : 'bg-muted text-foreground border-border hover:bg-muted/70'} transition-colors text-[11px]`}>Retry</button>
            )}
          </div>
        )}
        {tail && !compact && (
          <span className={`absolute bottom-0 ${mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'} translate-y-1 w-3 h-3 ${mine ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-white border-l border-b'} transform rotate-45`} />
        )}
      </div>
    </div>
  );
}

export default function GroupConversationPage({ params }) {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const { toast } = useToast();
  const groupId = params.id;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const typingClearRef = useRef(null);
  const seenRef = useRef(new Set());
  const socketRef = useRef(null);
  const viewportRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

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

  // Load history
  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !groupId) return;
      try {
        const res = await api.groupMessages(accessToken, groupId);
        if (!active) return;
        const mapped = (res.messages || []).map((m) => ({
          id: m.id || m._id,
          mine: String(m.sender) === String(user?.id),
          text: m.text,
          ts: new Date(m.createdAt).getTime(),
          status: String(m.sender) === String(user?.id) ? 'sent' : undefined,
        }));
        setMessages(mapped);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
      } catch {}
    })();
    return () => { active = false; };
  }, [accessToken, groupId, user?.id]);

  // Socket events
  useEffect(() => {
    if (!accessToken || !groupId) return;
    let s;
    let cleanup;
    (async () => {
      s = getSocket(accessToken);
      socketRef.current = s;
      s.emit('join_group', { groupId });

      const onReceive = (msg) => {
        if (String(msg.group) !== String(groupId)) return;
        // hide typing immediately on message
        if (typingClearRef.current) { clearTimeout(typingClearRef.current); typingClearRef.current = null; }
        setTyping(false);
        const key = String(msg.clientId || msg._id);
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);
        setMessages((prev) => {
          if (msg.clientId) {
            const idx = prev.findIndex((m) => m.clientId && String(m.clientId) === String(msg.clientId));
            if (idx !== -1) {
              const clone = prev.slice();
              clone[idx] = { ...clone[idx], id: msg._id, ts: new Date(msg.createdAt).getTime(), status: 'sent' };
              return clone;
            }
          }
          return [...prev, { id: msg._id, mine: String(msg.sender) === String(user?.id), text: msg.text, ts: new Date(msg.createdAt).getTime(), status: String(msg.sender) === String(user?.id) ? 'sent' : undefined }];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
      };

      const onTyping = ({ groupId: gid, userId: uid, isTyping }) => {
        if (String(gid) !== String(groupId) || String(uid) === String(user?.id)) return;
        setTyping(!!isTyping);
        if (isTyping) {
          if (typingClearRef.current) clearTimeout(typingClearRef.current);
          typingClearRef.current = setTimeout(() => setTyping(false), 3000);
        }
      };

      const onSeen = ({ groupId: gid, by, ids = [] }) => {
        if (String(gid) !== String(groupId) || String(by) === String(user?.id)) return;
        setMessages((prev) => prev.map(m => (ids.includes(m.id) ? { ...m, status: 'seen' } : m)));
      };

      const onError = ({ message, clientId }) => {
        setMessages((prev) => prev.map(m => (clientId && m.clientId === clientId) ? { ...m, status: 'failed' } : m));
        try { toast({ title: 'Message not sent', description: message || 'Unable to send group message', variant: 'destructive' }); } catch {}
      };

      s.on('receive_group_message', onReceive);
      s.on('group_typing', onTyping);
      s.on('group_messages_seen', onSeen);
      s.on('error_group_message', onError);

      cleanup = () => {
        try { s.emit('leave_group', { groupId }); } catch {}
        s.off('receive_group_message', onReceive);
        s.off('group_typing', onTyping);
        s.off('group_messages_seen', onSeen);
        s.off('error_group_message', onError);
      };
    })();
    return () => cleanup?.();
  }, [accessToken, groupId, user?.id]);

  const send = () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    seenRef.current.add(clientId);
    setMessages((prev) => [...prev, { id: clientId, clientId, mine: true, text, ts: Date.now(), status: 'sending' }]);
    setInput("");
    try { socketRef.current.emit('group_typing', { groupId, isTyping: false }); } catch {}
    try { socketRef.current.emit('send_group_message', { groupId, text, clientId }); } catch (e) {
      setMessages((prev) => prev.map(m => (m.clientId === clientId) ? { ...m, status: 'failed' } : m));
    }
  };

  const retryMessage = (m) => {
    if (!m || !m.mine || m.status !== 'failed' || !socketRef.current) return;
    const newClientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => prev.map(x => (x.clientId && x.clientId === m.clientId) ? { ...x, clientId: newClientId, status: 'sending', ts: Date.now() } : x));
    try { socketRef.current.emit('group_typing', { groupId, isTyping: false }); } catch {}
    try { socketRef.current.emit('send_group_message', { groupId, text: m.text, clientId: newClientId }); } catch (e) {
      setMessages((prev) => prev.map(x => (x.clientId && x.clientId === newClientId) ? { ...x, status: 'failed' } : x));
    }
  };

  useEffect(() => {
    const el = viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!el) return;
    const onScroll = () => {
      const at = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 8;
      setAtBottom(at);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="h-16 px-3 sm:px-4 flex items-center gap-2">
          <Link href="/groups"><Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">←</Button></Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">Group</h2>
          </div>
        </div>
      </motion.header>

      {/* Messages */}
      <ScrollArea ref={viewportRef} className="flex-1 px-4 py-2">
        <div className="space-y-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}>
          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const isSameSender = prev && prev.mine === m.mine;
            const compact = !!isSameSender;
            const isLastInGroup = !messages[idx + 1] || messages[idx + 1].mine !== m.mine;
            return (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Message
                  mine={m.mine}
                  text={m.text}
                  time={isLastInGroup ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(m.ts) : ''}
                  compact={compact}
                  tail={isLastInGroup}
                  status={m.status}
                  onRetry={m.mine && m.status === 'failed' ? () => retryMessage(m) : undefined}
                />
              </motion.div>
            );
          })}
          <AnimatePresence>
            {typing && atBottom && (
              <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <div className="px-3 py-2 text-sm text-muted-foreground">Someone is typing…</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} className="h-28" />
        </div>
      </ScrollArea>

      {/* Composer */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-0 z-10 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          {!isMobile && (
            <div className="relative">
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setShowEmojiPicker((v) => !v)}>
                <span className="text-xl">😊</span>
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-10 left-0 z-20 shadow-lg border bg-white rounded-md">
                  <Picker onEmojiClick={(e) => setInput((prev) => prev + (e?.emoji || ''))} lazyLoadEmojis skinTonesDisabled searchDisabled width={320} height={380} />
                </div>
              )}
            </div>
          )}
          <textarea value={input} onChange={(e) => {
            setInput(e.target.value);
            try { socketRef.current?.emit('group_typing', { groupId, isTyping: true }); } catch {}
          }} placeholder="Write a message…" rows={1} className="flex-1 resize-none rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          <Button onClick={send} className="bg-gradient-to-r from-orange-500 to-red-600">Send</Button>
        </div>
      </motion.div>
    </div>
  );
}
