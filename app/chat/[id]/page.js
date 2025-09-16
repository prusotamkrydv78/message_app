"use client";
import { useEffect, useMemo, useRef, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Send, ChevronDown, X, FileText, FileArchive, File, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { useSocket } from "../../../lib/socket";
import { CallManager } from "../../../lib/webrtc";
import CallModal from "../../../components/ui/call-modal";
import BottomNav from "../../../components/ui/bottom-nav";
import TypingIndicator from "../../../components/ui/typing-indicator";
import { useToast } from "../../../components/ui/use-toast";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function AutoGrowTextarea({ value, onChange, placeholder, onSend, onBlur, inputRef }) {
  const inner = useRef(null);
  const ref = inputRef || inner;
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + "px";
  }, [value, ref]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
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
      className="flex-1 w-full no-scrollbar resize-none rounded-full px-4 py-2 bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors shadow-sm"
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

function Header({ title, phone, elevated, callManager, callState, otherId, isOnline, onDelete, deleting }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b transition-shadow duration-200 ${elevated ? 'shadow-lg' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-16 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium text-xs sm:text-sm">
              {getInitials(title)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm sm:text-base text-foreground truncate">{title}</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              {phone && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0"
            onClick={() => callManager?.startCall(otherId, false)}
            disabled={['calling','ringing','connected'].includes(callState)}
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0"
            onClick={() => callManager?.startCall(otherId, true)}
            disabled={['calling','ringing','connected'].includes(callState)}
          >
            <Video className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 hidden sm:flex"
            onClick={onDelete}
            disabled={!!deleting}
            aria-label="Delete chat"
            title={deleting ? 'Deleting…' : 'Delete chat'}
          >
            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
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

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B','KB','MB','GB'];
  let v = bytes; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v % 1 === 0 ? v : v.toFixed(1)} ${units[i]}`;
}

function fileIconFor(att) {
  const name = (att.filename || att.original_filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return FileText;
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return FileArchive;
  return File;
}

function AttachmentPreview({ att, uploading, onOpenImage, onRetry, className = '' }) {
  if (!att) return null;
  const isImage = (att.type === 'image') || (att.mimeType || '').startsWith('image/');
  const isVideo = (att.type === 'video') || (att.mimeType || '').startsWith('video/');
  const href = att.secure_url || att.url || att.localUrl || '#';
  const src = att.localUrl || att.secure_url || att.url;
  const progress = typeof att._progress === 'number' ? att._progress : (uploading ? 0 : 1);
  const hasError = !!att._error;

  if (isImage) {
    return (
      <div onClick={() => onOpenImage?.(src || href)} className={`relative block overflow-hidden rounded-xl border bg-white shadow-sm cursor-zoom-in hover:ring-2 hover:ring-blue-500/40 transition-shadow ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={att.filename || 'image'}
          className="w-full max-w-[300px] md:max-w-[380px] max-h-72 object-cover select-none"
          draggable={false}
        />
        {uploading && !hasError && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <div className="h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {uploading && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 md:h-2 bg-white/40">
            <div className="h-full bg-blue-600/90 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center gap-2 text-sm">
            <span>Upload failed</span>
            {onRetry && (
              <button type="button" onClick={(e) => { e.preventDefault(); onRetry(); }} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className={`relative rounded-xl overflow-hidden border bg-black shadow-sm ${className || 'max-w-[300px] md:max-w-[380px]' }`}>
        <video controls className="w-full h-auto">
          <source src={src} type={att.mimeType || 'video/mp4'} />
        </video>
        {uploading && !hasError && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <div className="h-8 w-8 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {uploading && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 md:h-2 bg-white/30">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-black/60 text-white flex items-center justify-center gap-2 text-sm">
            <span>Upload failed</span>
            {onRetry && (
              <button type="button" onClick={(e) => { e.preventDefault(); onRetry(); }} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  const Icon = fileIconFor(att);
  return (
    <div className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm ${className || 'max-w-[280px]' }`}>
      <Icon className="h-4 w-4 text-blue-600" />
      <a href={href} target="_blank" rel="noreferrer" className="font-medium truncate flex-1">
        {att.filename || att.original_filename || 'file'}
      </a>
      {!!att.bytes && <span className="text-xs text-muted-foreground whitespace-nowrap">{formatBytes(att.bytes)}</span>}
      {uploading && !hasError && <span className="ml-1 h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
      {hasError && onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 text-xs">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
}

// Top-level Gallery (polished image grid for 1-4+ images)
function Gallery({ items = [], onOpen, onRetry, msgKey }) {
  const allImages = items.every(a => (a.type === 'image') || ((a.mimeType||'').startsWith('image/')));
  if (!allImages) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {items.map((att, idx) => (
          <AttachmentPreview key={idx} att={att} uploading={!!att._uploading} onOpenImage={(url) => onOpen?.(idx, url)} onRetry={onRetry ? () => onRetry(msgKey, idx) : undefined} />
        ))}
      </div>
    );
  }
  const n = items.length;
  if (n === 1) {
    return (
      <AttachmentPreview att={items[0]} uploading={!!items[0]._uploading} onOpenImage={(url) => onOpen?.(0, url)} onRetry={onRetry ? () => onRetry(msgKey, 0) : undefined} className="w-full max-w-[380px]" />
    );
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 max-w-[520px]">
        {items.map((att, idx) => (
          <AttachmentPreview key={idx} att={att} uploading={!!att._uploading} onOpenImage={(url) => onOpen?.(idx, url)} onRetry={onRetry ? () => onRetry(msgKey, idx) : undefined} className="w-full" />
        ))}
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="grid grid-cols-2 gap-2 max-w-[560px]">
        <AttachmentPreview att={items[0]} uploading={!!items[0]._uploading} onOpenImage={(url) => onOpen?.(0, url)} onRetry={onRetry ? () => onRetry(msgKey, 0) : undefined} className="row-span-2 h-full" />
        <AttachmentPreview att={items[1]} uploading={!!items[1]._uploading} onOpenImage={(url) => onOpen?.(1, url)} onRetry={onRetry ? () => onRetry(msgKey, 1) : undefined} />
        <AttachmentPreview att={items[2]} uploading={!!items[2]._uploading} onOpenImage={(url) => onOpen?.(2, url)} onRetry={onRetry ? () => onRetry(msgKey, 2) : undefined} />
      </div>
    );
  }
  const visible = items.slice(0, 4);
  const remaining = n - 4;
  return (
    <div className="grid grid-cols-2 gap-2 max-w-[560px]">
      {visible.map((att, idx) => {
        const isLast = idx === 3 && remaining > 0;
        return (
          <div key={idx} className="relative">
            <AttachmentPreview att={att} uploading={!!att._uploading} onOpenImage={(url) => onOpen?.(idx, url)} onRetry={onRetry ? () => onRetry(msgKey, idx) : undefined} className="w-full" />
            {isLast && (
              <button type="button" onClick={() => onOpen?.(idx, att.secure_url || att.url || att.localUrl)} className="absolute inset-0 bg-black/40 text-white text-2xl font-semibold flex items-center justify-center rounded-xl">
                +{remaining}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Message({ mine, text, attachments, time, compact, tail, status, onRetry, msgKey, onRetryAttachment, onOpenLightbox }) {
  const containerGap = compact ? "-mt-1" : "mt-2";
  // detect emoji-only
  const clean = (text || '').trim();
  const emojiMatches = clean.match(/\p{Extended_Pictographic}/gu) || [];
  const isEmojiOnly = clean.length > 0 && emojiMatches.length > 0 && clean.replace(/\p{Extended_Pictographic}|\p{Emoji_Component}|\u200D|\uFE0F/gu, '').trim().length === 0;
  const emojiCount = emojiMatches.length;

  if (isEmojiOnly && (!attachments || attachments.length === 0)) {
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

  const baseBubble = "max-w-[76%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed";
  const shadow = compact ? "shadow-none" : "shadow-sm";
  const hasMedia = !!(attachments && attachments.length);
  const colors = mine 
    ? (hasMedia ? "bg-white border text-foreground" : "bg-gradient-to-r from-orange-500 to-red-600 text-white")
    : "bg-white border text-foreground";
  
  return (
    <div className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap}`}>
      <div className={`relative ${baseBubble} ${colors} ${shadow} transition-all duration-200 hover:shadow-md`}>
        {attachments && attachments.length > 0 && (
          <div className={`${text ? 'mb-2' : ''}`}>
            <Gallery
              items={attachments}
              msgKey={msgKey}
              onRetry={onRetryAttachment}
              onOpen={(idx, url) => { try {
                const imgs = attachments
                  .filter(a => (a.type === 'image') || ((a.mimeType||'').startsWith('image/')))
                  .map(a => a.secure_url || a.url || a.localUrl)
                  .filter(Boolean);
                const chosen = url || imgs[idx] || null;
                if (chosen) {
                  onOpenLightbox && onOpenLightbox(chosen, imgs, Math.max(0, imgs.indexOf(chosen)));
                }
              } catch {} }}
            />
          </div>
        )}
        {!!text && <div className="whitespace-pre-wrap break-words">{text}</div>}
        {!!time && (
          <div className={`text-xs mt-1.5 flex items-center gap-2 ${mine ? (hasMedia ? "text-muted-foreground" : "text-white/80") : "text-muted-foreground"}`}>
            <span>{time}</span>
            {mine && <Tick state={status} />}
            {mine && status === 'failed' && (
              <button
                type="button"
                onClick={onRetry}
                className={`px-2 py-0.5 rounded border ${mine ? 'bg-white/10 text-white/90 border-white/30 hover:bg-white/20' : 'bg-muted text-foreground border-border hover:bg-muted/70'} transition-colors text-[11px]`}
                title="Retry sending"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {tail && !compact && !hasMedia && (
          <span
            className={`absolute bottom-0 ${mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'} translate-y-1 w-3 h-3 ${mine ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-white border-l border-b'} transform rotate-45`}
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
  const { toast } = useToast();

  const resolvedParams = use(params);
  const title = searchParams.get("name") || "User";
  const phone = searchParams.get("phone") || "";
  // Prefer the explicit otherId from query string (provided when navigating via accept handlers)
  // Fallback to route param for links that use /chat/[otherUserId]
  const otherId = searchParams.get("otherId") || resolvedParams.id || "";

  const [input, setInput] = useState("");
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingClearRef = useRef(null);
  const [messages, setMessages] = useState([]); // each: {id, mine, text, ts, status}
  const socketRef = useRef(null);
  const seenRef = useRef(new Set()); // tracks _id or clientId to prevent duplicates
  const viewportRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [callManager, setCallManager] = useState(null);
  const [callState, setCallState] = useState(null); // { type, otherId, status, callerName }
  const remoteAudioRef = useRef(null);
  const composerRef = useRef(null);
  const [isOnline, setIsOnline] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]); // array of urls
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [showLightboxControls, setShowLightboxControls] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gestureRef = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false });
  const typingEmitRef = useRef(null);
  const callMetaRef = useRef({ direction: null, isVideo: false, startedAt: null, connected: false, logged: false });
  const lastPersistRef = useRef(0);
  const resendLockRef = useRef(false);
  const [conversationId, setConversationId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Enhanced lightbox keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (!lightboxOpen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        navigateLightbox(1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateLightbox(-1);
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setLightboxZoom(z => Math.min(z * 1.2, 3));
      }
      if (e.key === '-') {
        e.preventDefault();
        setLightboxZoom(z => Math.max(z / 1.2, 0.5));
      }
      if (e.key === '0') {
        e.preventDefault();
        setLightboxZoom(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  // Navigate lightbox with smooth transitions
  const navigateLightbox = (direction) => {
    if (!lightboxImages.length) return;
    setLightboxLoading(true);
    setLightboxZoom(1);
    setPan({ x: 0, y: 0 });
    const newIndex = direction > 0 
      ? (lightboxIndex + 1) % lightboxImages.length
      : (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    setLightboxIndex(newIndex);
    setLightboxUrl(lightboxImages[newIndex]);
    setTimeout(() => setLightboxLoading(false), 150);
  };

  // Auto-hide controls in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    setShowLightboxControls(true);
    const timer = setTimeout(() => setShowLightboxControls(false), 3000);
    const onMove = () => {
      setShowLightboxControls(true);
      clearTimeout(timer);
      setTimeout(() => setShowLightboxControls(false), 3000);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
    };
  }, [lightboxOpen, lightboxIndex]);

  // Body scroll lock when lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (lightboxOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [lightboxOpen]);

  // Preload neighbor images for snappier nav
  useEffect(() => {
    if (!lightboxImages.length) return;
    const prev = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    const next = (lightboxIndex + 1) % lightboxImages.length;
    [prev, next].forEach(i => {
      const url = lightboxImages[i];
      const img = new Image();
      img.src = url;
    });
  }, [lightboxIndex, lightboxImages]);

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

  const retryMessage = (m) => {
    if (!m || !m.mine || m.status !== 'failed' || !socketRef.current || !otherId) return;
    if (resendLockRef.current) return;
    resendLockRef.current = true;
    const newClientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Optimistically flip to sending with new clientId/ts
    setMessages((prev) => prev.map(x => (x.clientId && x.clientId === m.clientId)
      ? { ...x, clientId: newClientId, status: 'sending', ts: Date.now() }
      : x
    ));
    // Emit stop typing and resend
    try { socketRef.current.emit('typing', { to: otherId, isTyping: false }); } catch {}
    try { socketRef.current.emit('send_message', { to: otherId, text: m.text, clientId: newClientId }); } catch (e) {
      // If immediate error, flip back to failed
      setMessages((prev) => prev.map(x => (x.clientId && x.clientId === newClientId)
        ? { ...x, status: 'failed' }
        : x
      ));
    } finally {
      setTimeout(() => { resendLockRef.current = false; }, 200);
    }
  };

  // Fetch history
  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !otherId) return;
      try {
        const res = await api.messagesWith(accessToken, otherId);
        setConversationId(res.conversationId || null);
        const callsRes = await api.callsWith(accessToken, otherId).catch(() => ({ calls: [] }));
        if (!active) return;
        const mapped = (res.messages || []).map((m, idx) => ({
          id: m._id || idx,
          mine: String(m.sender) === String(user?.id),
          text: m.text,
          attachments: m.attachments || [],
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

  const handleDeleteChat = async () => {
    if (!accessToken || !conversationId) {
      toast({ title: 'Cannot delete', description: 'Conversation not found.', variant: 'destructive' });
      return;
    }
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this conversation? This cannot be undone.') : true;
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteConversation(accessToken, conversationId);
      toast({ title: 'Conversation deleted' });
      router.replace('/chat');
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

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
            remoteAudioRef.current.play().catch(() => {});
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
      //console.error('Call error:', error);
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
      // Request presence for header indicator once connected
      const requestPresence = () => {
        try { s.emit('presence_request', { userId: otherId }); } catch {}
      };
      if (s.connected) requestPresence();
      s.on('connect', requestPresence);
      // Fallback retry shortly after mount in case connect races
      setTimeout(requestPresence, 600);
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

        // Any delivered message for this chat should hide typing immediately
        if (typingClearRef.current) {
          clearTimeout(typingClearRef.current);
          typingClearRef.current = null;
        }
        setTyping(false);

        const key = String(msg.clientId || msg._id);
        if (seenRef.current.has(key)) return; // already handled
        seenRef.current.add(key);

        setMessages((prev) => {
          // Reconcile optimistic message if clientId matches
          if (msg.clientId) {
            const idx = prev.findIndex((m) => m.clientId && String(m.clientId) === String(msg.clientId));
            if (idx !== -1) {
              const clone = prev.slice();
              clone[idx] = { id: msg._id, clientId: msg.clientId, mine: true, text: msg.text, attachments: msg.attachments || [], ts: new Date(msg.createdAt).getTime(), status: 'sent' };
              return clone;
            }
          }
          const mine = String(msg.sender) === String(user?.id);
          return [
            ...prev,
            { id: msg._id, clientId: msg.clientId, mine, text: msg.text, attachments: msg.attachments || [], ts: new Date(msg.createdAt).getTime(), status: mine ? 'sent' : undefined },
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

      // Handle server-side message send errors
      s.on('error_message', ({ message, clientId } = {}) => {
        setMessages((prev) => {
          if (clientId) return prev.filter(m => m.clientId !== clientId);
          return prev.filter(m => m.status !== 'sending');
        });
        try {
          toast({
            title: 'Message not sent',
            description: message || 'Unable to deliver your message.',
            variant: 'destructive',
          });
        } catch {}
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
          s.off('error_message');
          s.off('presence_update', onPresence);
          s.off('connect');
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
    if (bottomRef.current && viewportRef.current) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (bottomRef.current && viewportRef.current && atBottom) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [messages, atBottom]);

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
    if ((!text) || !otherId || !socketRef.current) return;
    
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    seenRef.current.add(clientId);
    
    // Add optimistic message
    setMessages((prev) => [ 
      ...prev, 
      { id: clientId, clientId, mine: true, text, ts: Date.now(), status: 'sending' } 
    ]);
    
    // Clear input immediately for better UX
    setInput("");
    
    // Stop indicating typing to the recipient immediately on send
    try {
      socketRef.current.emit('typing', { to: otherId, isTyping: false });
    } catch {}
    if (typingEmitRef.current) {
      clearTimeout(typingEmitRef.current);
      typingEmitRef.current = null;
    }

    // Emit via socket
    try {
      socketRef.current.emit("send_message", { to: otherId, text, clientId });
    } catch (error) {
      //console.error("Failed to send message:", error);
      // Revert optimistic update on error
      setMessages((prev) => prev.filter(m => m.clientId !== clientId));
      setInput(text); // Restore input
    }
    
    // Keep input active after send and ensure scroll to bottom
    setTimeout(() => {
      if (composerRef.current) {
        composerRef.current.focus();
      }
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  // Attachments: pick files and upload then send as a message
  const onPickFiles = () => {
    try { fileInputRef.current?.click(); } catch {}
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !accessToken || !socketRef.current || !otherId) return;
    setUploading(true);
    const caption = input.trim();
    // Create local preview attachments
    const previews = files.map((f) => {
      const isImg = (f.type || '').startsWith('image/');
      const isVid = (f.type || '').startsWith('video/');
      return {
        filename: f.name,
        mimeType: f.type,
        bytes: f.size,
        type: isImg ? 'image' : (isVid ? 'video' : 'file'),
        localUrl: URL.createObjectURL(f),
        _uploading: true,
        _progress: 0,
        _file: f,
      };
    });
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    seenRef.current.add(clientId);
    // Optimistic render with local previews
    setMessages((prev) => [
      ...prev,
      { id: clientId, clientId, mine: true, text: caption, attachments: previews, ts: Date.now(), status: 'sending' },
    ]);
    // Clear caption input after adding optimistic message
    if (caption) setInput('');

    try { socketRef.current.emit('typing', { to: otherId, isTyping: false }); } catch {}

    try {
      // Upload files one by one to get per-file progress
      const results = new Array(files.length).fill(null);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // progress callback to update state
        const onProgress = (p) => {
          setMessages((prev) => prev.map(m => {
            if (m.clientId !== clientId) return m;
            const atts = (m.attachments || []).slice();
            if (atts[i]) atts[i] = { ...atts[i], _progress: p };
            return { ...m, attachments: atts };
          }));
        };
        try {
          const resp = await api.uploadFile(accessToken, file, onProgress);
          const arr = resp.attachments || [];
          if (arr.length) {
            results[i] = arr[0];
            // apply uploaded for this index immediately
            setMessages((prev) => prev.map(m => {
              if (m.clientId !== clientId) return m;
              const atts = (m.attachments || []).slice();
              if (atts[i]) atts[i] = { ...arr[0], _uploading: false };
              return { ...m, attachments: atts };
            }));
          }
        } catch (err) {
          // mark this attachment as failed
          setMessages((prev) => prev.map(m => {
            if (m.clientId !== clientId) return m;
            const atts = (m.attachments || []).slice();
            if (atts[i]) atts[i] = { ...atts[i], _uploading: false, _error: true };
            return { ...m, attachments: atts };
          }));
        }
      }
      // Only emit when all succeeded
      if (results.every(Boolean)) {
        const uploaded = results.map(a => ({ ...a, _uploading: false }));
        setMessages((prev) => prev.map(m => (
          m.clientId === clientId
            ? { ...m, attachments: uploaded }
            : m
        )));
        socketRef.current.emit('send_message', { to: otherId, text: caption, attachments: uploaded, clientId });
      }
    } catch (err) {
      // Keep optimistic message; already marked failed attachments above
      try { toast({ title: 'Upload failed', description: err?.message || 'Please try again.', variant: 'destructive' }); } catch {}
    } finally {
      setUploading(false);
      try { (e.target.files || []).forEach(f => URL.revokeObjectURL && URL.revokeObjectURL(f)); } catch {}
      try { e.target.value = ''; } catch {}
    }
  };

  // Retry a specific attachment upload by message clientId/id and attachment index
  const retryUploadAttachment = async (messageKey, attIndex) => {
    if (!accessToken) return;
    const msg = (messages || []).find(m => String(m.clientId || m.id) === String(messageKey));
    if (!msg) return;
    const att = (msg.attachments || [])[attIndex];
    if (!att || !att._file) return;
    try {
      // reset error and set uploading
      setMessages((prev) => prev.map(m => {
        if (String(m.clientId || m.id) !== String(messageKey)) return m;
        const atts = (m.attachments || []).slice();
        if (atts[attIndex]) atts[attIndex] = { ...atts[attIndex], _error: false, _uploading: true, _progress: 0 };
        return { ...m, attachments: atts };
      }));
      const resp = await api.uploadFile(accessToken, att._file, (p) => {
        setMessages((prev) => prev.map(m => {
          if (String(m.clientId || m.id) !== String(messageKey)) return m;
          const atts = (m.attachments || []).slice();
          if (atts[attIndex]) atts[attIndex] = { ...atts[attIndex], _progress: p };
          return { ...m, attachments: atts };
        }));
      });
      const arr = resp.attachments || [];
      if (arr.length) {
        const uploaded = arr[0];
        setMessages((prev) => prev.map(m => {
          if (String(m.clientId || m.id) !== String(messageKey)) return m;
          const atts = (m.attachments || []).slice();
          if (atts[attIndex]) atts[attIndex] = { ...uploaded, _uploading: false };
          // If all attachments uploaded now and not yet emitted, emit
          const allUploaded = atts.every(a => a && !a._uploading && !a._error && (a.secure_url || a.url));
          if (allUploaded && !m._emitted) {
            try { socketRef.current?.emit('send_message', { to: otherId, text: m.text || '', attachments: atts, clientId: m.clientId }); } catch {}
            return { ...m, attachments: atts, _emitted: true };
          }
          return { ...m, attachments: atts };
        }));
      }
    } catch (err) {
      setMessages((prev) => prev.map(m => {
        if (String(m.clientId || m.id) !== String(messageKey)) return m;
        const atts = (m.attachments || []).slice();
        if (atts[attIndex]) atts[attIndex] = { ...atts[attIndex], _uploading: false, _error: true };
        return { ...m, attachments: atts };
      }));
    }
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col">
        {/* Header */}
        <Header
          title={title}
          phone={phone}
          elevated={headerElevated}
          callManager={callManager}
          callState={callState?.status || 'idle'}
          otherId={otherId}
          isOnline={isOnline}
          onDelete={handleDeleteChat}
          deleting={deleting}
        />

        {/* Messages list */}
        <ScrollArea ref={viewportRef} className="flex-1 px-4 py-2">
          {/* Keep chat height stable and pin content to bottom for short conversations */}
          <div className="min-h-full flex flex-col justify-end">
            <div className="space-y-1 pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
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
                    attachments={g.m.attachments}
                    time={g.m.isLastInGroup ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(g.m.ts) : ""}
                    compact={compact}
                    tail={g.m.isLastInGroup}
                    status={g.m.status}
                    msgKey={g.m.clientId || g.m.id}
                    onRetryAttachment={retryUploadAttachment}
                    onOpenLightbox={(url, imgs = [], idx = 0) => { 
                      setLightboxImages(imgs && imgs.length ? imgs : [url]); 
                      setLightboxIndex(idx || 0); 
                      setLightboxUrl(url); 
                      setLightboxZoom(1);
                      setLightboxLoading(false);
                      setLightboxOpen(true); 
                    }}
                    onRetry={g.m.mine && g.m.status === 'failed' ? () => retryMessage(g.m) : undefined}
                  />
                </motion.div>
              );
              })}
              <AnimatePresence>
                {typing && atBottom && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Anchor for keeping latest message just above the input */}
              <div ref={bottomRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Composer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 z-10 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              send(); 
            }} 
            className="flex items-end gap-2 sm:gap-3"
          >
            <div className="flex-1 relative">
              <AutoGrowTextarea
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message..."
                onSend={send}
                onBlur={() => {
                  if (socketRef.current && otherId) {
                    socketRef.current.emit('typing', { to: otherId, isTyping: false });
                  }
                }}
                inputRef={composerRef}
              />
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 right-0 z-20">
                  <EmojiPicker onEmojiClick={(emojiData) => { setInput((prev) => `${prev}${emojiData.emoji}`); }} />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
            <Button
              type="button"
              size="icon"
              onClick={onPickFiles}
              className={`h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-full border ${uploading ? 'opacity-60' : ''}`}
              disabled={uploading}
              aria-label="Attach files"
              title={uploading ? 'Uploading…' : 'Attach files'}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className={`h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-full transition-all duration-200 ${
                input.trim() 
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg' 
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

        {/* Enhanced Lightbox */}
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setLightboxOpen(false)}
            >
              {/* Top Controls */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: showLightboxControls ? 1 : 0, y: showLightboxControls ? 0 : -20 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent"
              >
                <div className="flex items-center gap-4 text-white">
                  {lightboxImages.length > 1 && (
                    <span className="text-sm bg-black/30 px-3 py-1 rounded-full">
                      {lightboxIndex + 1} / {lightboxImages.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); window.open(lightboxUrl, '_blank'); }} 
                    className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLightboxOpen(false)} 
                    className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>

              {/* Navigation Arrows */}
              {lightboxImages.length > 1 && (
                <>
                  <motion.button 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: showLightboxControls ? 1 : 0, x: showLightboxControls ? 0 : -20 }}
                    transition={{ duration: 0.2 }}
                    type="button" 
                    className="absolute left-4 md:left-8 text-white/90 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all hover:scale-110" 
                    onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </motion.button>
                  <motion.button 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: showLightboxControls ? 1 : 0, x: showLightboxControls ? 0 : 20 }}
                    transition={{ duration: 0.2 }}
                    type="button" 
                    className="absolute right-4 md:right-8 text-white/90 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all hover:scale-110" 
                    onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </motion.button>
                </>
              )}

              {/* Thumbnail Strip */}
              {lightboxImages.length > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: showLightboxControls ? 1 : 0, y: showLightboxControls ? 0 : 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 max-w-[90vw] overflow-x-auto scrollbar-hide">
                    {lightboxImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxLoading(true);
                          setLightboxZoom(1);
                          setLightboxIndex(idx);
                          setLightboxUrl(imgUrl);
                          setTimeout(() => setLightboxLoading(false), 150);
                        }}
                        className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all hover:scale-110 ${
                          idx === lightboxIndex 
                            ? 'border-white shadow-lg' 
                            : 'border-white/30 hover:border-white/60'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={imgUrl} 
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                        {idx === lightboxIndex && (
                          <div className="absolute inset-0 bg-white/20" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Bottom Controls */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: showLightboxControls ? 1 : 0, y: showLightboxControls ? 0 : 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center p-4 bg-gradient-to-t from-black/50 to-transparent"
              >
                <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2">
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.max(z / 1.2, 0.5)); }} 
                    className="text-white/80 hover:text-white p-1 transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-white/80 text-sm min-w-[3rem] text-center">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.min(z * 1.2, 3)); }} 
                    className="text-white/80 hover:text-white p-1 transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); }} 
                    className="text-white/80 hover:text-white p-1 transition-colors"
                    title="Reset Zoom (0)"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>

              {/* Keyboard Shortcuts Hint */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: showLightboxControls ? 0.7 : 0 }}
                transition={{ duration: 0.2, delay: 0.5 }}
                className={`absolute right-4 text-white/60 text-xs bg-black/20 rounded px-2 py-1 ${
                  lightboxImages.length > 1 ? 'bottom-32' : 'bottom-20'
                }`}
              >
                ← → Space: Navigate • +/- : Zoom • 0: Reset • Esc: Close
              </motion.div>

              {/* Main Image Container */}
              <motion.div 
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  transform: `scale(${lightboxZoom})`,
                  transition: 'transform 0.2s ease-out'
                }}
              >
                {lightboxLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <div className="h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={lightboxUrl || ''} 
                  alt="preview" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
                  draggable={false}
                  onLoad={() => setLightboxLoading(false)}
                  onError={() => setLightboxLoading(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
            onToggleCamera={() => callManager?.toggleCamera?.()}
            isVideo={!!callState.isVideo}
            localStream={callManager?.localStream || null}
            remoteStream={callManager?.remoteStream || null}
          />
        )}

        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>
    </div>
  );
}