"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import EmojiPicker from "emoji-picker-react";
import { getSocket } from "../../../lib/socket";
import { CallManager, VideoCallManager } from "../../../lib/webrtc";
import CallModal from "../../../components/ui/call-modal";
import VideoCallModal from "../../../components/ui/video-call-modal";
import CallRecord from "../../../components/ui/call-record";
import { AnimatePresence, motion } from "framer-motion";

function AutoGrowTextarea({ value, onChange, placeholder, onSend, onBlur }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "44px"; // Reset to single line height
    const scrollHeight = ref.current.scrollHeight;
    const maxHeight = 100; // Max height for ~4 lines
    ref.current.style.height = Math.min(scrollHeight, maxHeight) + "px";
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
      className="flex-1 resize-none px-4 py-3 bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 text-[15px] leading-[1.4] min-h-[44px] max-h-[100px] overflow-y-auto"
      style={{ height: '44px' }}
    />
  );
}

function Header({ title, phone, elevated, callManager, callState, otherId, isOnline, videoCallState, startVideoCall }) {
  return (
    <motion.header 
      className={`sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white backdrop-blur-sm transition-all duration-300 ${elevated ? 'shadow-lg' : 'shadow-md'}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-16 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Link href="/chat" className="size-10 grid place-items-center rounded-full hover:bg-white/20 transition-colors" aria-label="Back">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/>
              </svg>
            </Link>
          </motion.div>
          <motion.div 
            className="relative"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="size-11 rounded-full bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border-2 border-white/30 grid place-items-center text-sm font-bold shadow-lg">
              {title?.[0]?.toUpperCase() || "U"}
            </div>
            {isOnline && (
              <motion.div 
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
          <motion.div 
            className="leading-tight"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="font-bold text-lg truncate max-w-[40vw] sm:max-w-none">{title}</div>
            <div className={`text-sm font-medium ${isOnline ? 'text-green-200' : 'text-white/70'}`}>
              {isOnline ? 'Online' : 'Last seen recently'}
            </div>
          </motion.div>
        </div>
        <motion.div 
          className="flex items-center gap-1"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Video Call Button */}
          <motion.button 
            onClick={() => startVideoCall()}
            disabled={!!callState || !!videoCallState}
            className="relative group size-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm border border-white/20"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Start video call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5 group-hover:scale-110 transition-transform duration-200">
              <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M23 7l-7 5 7 5V7z"/>
              <rect strokeWidth="2.5" x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            {/* Tooltip */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              Video call
            </div>
          </motion.button>

          {/* Voice Call Button */}
          <motion.button 
            onClick={() => callManager?.startCall(otherId)}
            disabled={!!callState || !!videoCallState}
            className="relative group size-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm border border-white/20 ml-2"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Start voice call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5 group-hover:scale-110 transition-transform duration-200">
              <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0122 16.92z"/>
            </svg>
            {/* Tooltip */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              Voice call
            </div>
          </motion.button>

          {/* Menu Button */}
          <motion.button 
            className="relative group size-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20 ml-2"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="More options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5 group-hover:scale-110 transition-transform duration-200">
              <circle cx="12" cy="12" r="1" strokeWidth="2.5"/>
              <circle cx="19" cy="12" r="1" strokeWidth="2.5"/>
              <circle cx="5" cy="12" r="1" strokeWidth="2.5"/>
            </svg>
            {/* Tooltip */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              More options
            </div>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
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
  const containerGap = compact ? "mt-0.5" : "mt-3";
  // detect emoji-only
  const clean = (text || '').trim();
  const emojiMatches = clean.match(/\p{Extended_Pictographic}/gu) || [];
  const isEmojiOnly = clean.length > 0 && emojiMatches.length > 0 && clean.replace(/\p{Extended_Pictographic}|\p{Emoji_Component}|\u200D|\uFE0F/gu, '').trim().length === 0;
  const emojiCount = emojiMatches.length;

  if (isEmojiOnly) {
    const sizeClass = emojiCount <= 3 ? 'text-5xl' : 'text-2xl';
    return (
      <motion.div 
        className={`w-full flex ${mine ? 'justify-end' : 'justify-start'} ${containerGap} px-2`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <div className={`relative max-w-[70%] px-1 py-1`}>
          <div className={`leading-none ${sizeClass}`} style={{ lineHeight: 1 }}>
            {clean}
          </div>
          {!!time && <div className={`text-[10px] mt-1 text-gray-500 text-center`}>{time}</div>}
        </div>
      </motion.div>
    );
  }

  const baseBubble = "max-w-[75%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed";
  const shadow = compact ? "shadow-none" : mine ? "shadow-lg shadow-blue-500/20" : "shadow-md shadow-gray-300/30";
  const colors = mine ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white msg-in-right" : "bg-white text-gray-800 msg-in-left border border-gray-100";
  
  return (
    <motion.div 
      className={`w-full flex ${mine ? "justify-end" : "justify-start"} ${containerGap} px-2`}
      initial={{ x: mine ? 20 : -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div 
        className={`relative ${baseBubble} ${colors} ${shadow}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!!time && (
          <div className={`text-xs mt-1.5 flex items-center ${mine ? "text-white/80" : "text-gray-500"}`}>
            <span>{time}</span>
            {mine && <Tick state={status} />}
          </div>
        )}
        {tail && (
          <span
            className={`absolute bottom-0 ${mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'} translate-y-1 w-3 h-3 rounded-bl-[10px] rounded-tr-[10px] ${mine ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-white border-l border-b border-gray-100'} ${compact ? 'opacity-0' : 'opacity-100'} shadow-[inherit]`}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export default function ConversationPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, accessToken } = useAuth();

  // Video call functions
  const startVideoCall = async () => {
    if (videoCallManager) {
      await videoCallManager.startVideoCall(otherId);
    }
  };

  const answerVideoCall = async () => {
    if (videoCallManager && videoCallState?.offer) {
      await videoCallManager.answerVideoCall(videoCallState.offer);
    }
  };

  const declineVideoCall = () => {
    if (videoCallManager) {
      videoCallManager.declineVideoCall();
    }
  };

  const endVideoCall = () => {
    if (videoCallManager) {
      videoCallManager.endCall();
    }
  };

  const toggleVideoMute = () => {
    if (videoCallManager) {
      return videoCallManager.toggleMute();
    }
    return false;
  };

  const toggleCamera = () => {
    if (videoCallManager) {
      return videoCallManager.toggleCamera();
    }
    return false;
  };

  const title = searchParams.get("name") || "User";
  const phone = searchParams.get("phone") || "";
  const otherId = searchParams.get("otherId") || "";

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const typingClearRef = useRef(null);
  const [messages, setMessages] = useState([]); // each: {id, mine, text, ts, status}
  const [callRecords, setCallRecords] = useState([]); // call records
  const socketRef = useRef(null);
  const seenRef = useRef(new Set()); // tracks _id or clientId to prevent duplicates
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [callManager, setCallManager] = useState(null);
  const [videoCallManager, setVideoCallManager] = useState(null);
  const [callState, setCallState] = useState(null); // { type, otherId, status, callerName }
  const [videoCallState, setVideoCallState] = useState(null); // { type, otherId, status, callerName }
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isOnline, setIsOnline] = useState(null);
  const typingEmitRef = useRef(null);
  const [convoStatus, setConvoStatus] = useState('accepted'); // 'pending' | 'accepted'
  const [requestedBy, setRequestedBy] = useState(null);

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

  // Function to refresh chat data
  const refreshChatData = async () => {
    if (!accessToken || !otherId || !user?.id) return;
    try {
      const res = await api.messagesWith(accessToken, otherId);
      
      const mapped = (res.messages || []).map((m, idx) => ({
        id: m._id || idx,
        mine: String(m.sender) === String(user?.id),
        text: m.text,
        ts: new Date(m.createdAt).getTime(),
        status: String(m.sender) === String(user?.id) ? 'sent' : undefined,
      }));
      setMessages(mapped);

      // Map call records
      const callsMapped = (res.calls || []).map((c, idx) => ({
        id: c._id || `call-${idx}`,
        type: c.type, // 'voice' | 'video'
        status: c.status, // 'missed' | 'answered' | 'declined' | 'ended'
        duration: c.duration,
        mine: String(c.caller) === String(user?.id),
        ts: new Date(c.createdAt).getTime(),
        callerName: title,
      }));
      
      setCallRecords(callsMapped);
    } catch (error) {
      console.error('Error refreshing chat data:', error);
    }
  };

  // Fetch history
  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !otherId) return;
      try {
        // Load conversation list to determine status with this user
        const list = await api.conversations(accessToken);
        if (!active) return;
        const match = (list.conversations || []).find(c => String(c.otherUser?.id) === String(otherId));
        if (match) {
          setConvoStatus(match.status || 'accepted');
          setRequestedBy(match.requestedBy || null);
        } else {
          setConvoStatus('accepted');
          setRequestedBy(null);
        }
        
        // Use the refresh function for initial load
        await refreshChatData();
      } catch (error) {
        console.error('Error fetching messages/calls:', error);
      }
    })();
    return () => { active = false; };
  }, [accessToken, otherId, user?.id, title]);

  // Initialize call manager
  useEffect(() => {
    if (!accessToken || !user?.id) return;
    const s = getSocket(accessToken);
    const cm = new CallManager(s, user.id, accessToken);
    const vcm = new VideoCallManager(s, user.id, accessToken);
    
    // Voice call handlers
    cm.onIncomingCall = (from, offer) => {
      setCallState(prev => {
        // Prevent duplicate incoming call states
        if (prev && prev.type === 'incoming' && prev.otherId === from && prev.status === 'ringing') {
          return prev;
        }
        return { 
          type: 'incoming', 
          otherId: from, 
          status: 'ringing', 
          callerName: from === otherId ? title : 'Unknown',
          offer 
        };
      });
    };
    
    cm.onCallStateChange = (status) => {
      setCallState(prev => {
        // Prevent unnecessary re-renders if status hasn't changed
        if (prev && prev.status === status) return prev;
        return prev ? { ...prev, status } : { type: 'outgoing', otherId, status, callerName: title };
      });
      if (status === 'connected' && cm.remoteStream) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = cm.remoteStream;
        }
      }
      if (status === 'ended' || status === 'declined') {
        setCallState(null);
        // Refresh chat data to show new call record
        setTimeout(() => {
          refreshChatData();
        }, 1000);
      }
    };
    
    cm.onCallError = (error) => {
      console.error('Call error:', error);
    };

    // Video call handlers
    vcm.onIncomingCall = (from, offer) => {
      setVideoCallState(prev => {
        // Prevent duplicate incoming call states
        if (prev && prev.type === 'incoming' && prev.otherId === from && prev.status === 'ringing') {
          return prev;
        }
        return { 
          type: 'incoming', 
          otherId: from, 
          status: 'ringing', 
          callerName: from === otherId ? title : 'Unknown',
          offer 
        };
      });
    };
    
    vcm.onCallStateChange = (status) => {
      setVideoCallState(prev => {
        // Prevent unnecessary re-renders if status hasn't changed
        if (prev && prev.status === status) return prev;
        return prev ? { ...prev, status } : { type: 'outgoing', otherId, status, callerName: title };
      });
      if (status === 'connected') {
        if (localVideoRef.current && vcm.localStream) {
          localVideoRef.current.srcObject = vcm.localStream;
        }
        if (remoteVideoRef.current && vcm.remoteStream) {
          remoteVideoRef.current.srcObject = vcm.remoteStream;
        }
      }
      if (status === 'ended' || status === 'declined') {
        setVideoCallState(null);
        // Refresh chat data to show new call record
        setTimeout(() => {
          refreshChatData();
        }, 1000);
      }
    };
    
    vcm.onCallError = (error) => {
      console.error('Video call error:', error);
      setVideoCallState(null);
    };
    
    setCallManager(cm);
    setVideoCallManager(vcm);
    return () => {
      cm.endCall();
      vcm.endCall();
    };
  }, [accessToken, user?.id]);

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
    s.on('error_message', (e) => {
      if (e?.message) {
        alert(e.message);
      }
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
        s.off('error_message');
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
    // Block sending if connection not accepted
    if (convoStatus !== 'accepted') {
      alert('Connection request not accepted yet');
      return;
    }
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    seenRef.current.add(clientId);
    setMessages((prev) => [ ...prev, { id: clientId, clientId, mine: true, text, ts: Date.now(), status: 'sending' } ]);
    // emit via socket
    if (socketRef.current) {
      socketRef.current.emit("send_message", { to: otherId, text, clientId });
    }
    setInput("");
  };

  const combinedItems = useMemo(() => {
    const combined = [
      ...messages.map(m => ({ ...m, itemType: 'message' })),
      ...callRecords.map(c => ({ ...c, itemType: 'call' }))
    ];
    // Sort by timestamp in ascending order (oldest first)
    return combined.sort((a, b) => a.ts - b.ts);
  }, [messages, callRecords]);

  const groups = useMemo(() => {
    // Combine messages and call records, then sort by timestamp
    const fmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });
    const out = [];
    let lastDay = "";
    
    for (let i = 0; i < combinedItems.length; i++) {
      const item = combinedItems[i];
      const day = fmt.format(item.ts);
      if (day !== lastDay) {
        out.push({ type: "divider", key: `d-${day}-${item.id || out.length}`, label: day });
        lastDay = day;
      }
      
      if (item.itemType === 'message') {
        // Determine if next message is from same sender
        const next = combinedItems[i + 1];
        const isLastInGroup = !next || next.itemType !== 'message' || next.mine !== item.mine;
        out.push({ type: "message", key: `m-${item.id}`, m: { ...item, isLastInGroup } });
      } else if (item.itemType === 'call') {
        out.push({ type: "call", key: `c-${item.id}`, call: item });
      }
    }
    return out;
  }, [messages, callRecords]);

  if (loading || !user) return null;

  return (
    <motion.div 
      className="flex-1 flex flex-col bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-gray-50/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Header title={title} phone={phone} elevated={headerElevated} callManager={callManager} callState={callState} otherId={otherId} isOnline={isOnline} videoCallState={videoCallState} startVideoCall={startVideoCall} />

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll no-scrollbar px-2 py-3 pb-28 max-h-[calc(100vh-128px)] relative">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 2px, transparent 2px), radial-gradient(circle at 75% 75%, #8b5cf6 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }}></div>
        {convoStatus === 'pending' && (
          <div className="mb-2">
            {String(requestedBy) === String(user?.id) ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">Request sent. Waiting for acceptance.</div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-block">This user wants to connect with you.</span>
                <button
                  onClick={async () => {
                    try {
                      const list = await api.conversations(accessToken);
                      const match = (list.conversations || []).find(c => String(c.otherUser?.id) === String(otherId));
                      if (match?.id) {
                        await api.acceptConversation(accessToken, match.id);
                        setConvoStatus('accepted');
                        setRequestedBy(null);
                      }
                    } catch (e) {
                      alert(e.message || 'Failed to accept');
                    }
                  }}
                  className="text-xs h-7 px-3 rounded-full bg-black text-white active:scale-95"
                >Accept</button>
              </div>
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {groups.map((g, idx) => {
            if (g.type === "divider") return <DayDivider key={g.key} label={g.label} />;
            
            if (g.type === "call") {
              return (
                <motion.div
                  key={g.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  layout
                >
                  <CallRecord
                    type={g.call.type}
                    status={g.call.status}
                    duration={g.call.duration}
                    time={new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(g.call.ts)}
                    mine={g.call.mine}
                    callerName={g.call.callerName}
                  />
                </motion.div>
              );
            }
            
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
      <motion.div
        className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="px-4 py-3">
          <motion.form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-end gap-3"
            layout
          >
            {/* Left side buttons */}
            <div className="flex items-end gap-2 pb-2">
              {/* Desktop-only Emoji button */}
              {!isMobile && (
                <div className="relative flex items-center">
                  <motion.button 
                    type="button" 
                    onClick={() => setShowEmojis((v) => !v)} 
                    className={`size-6 grid place-items-center rounded-full transition-all duration-200 ${showEmojis ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Emoji picker"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </motion.button>
                  <AnimatePresence>
                    {showEmojis && (
                      <motion.div 
                        className="absolute bottom-8 left-0 z-30 bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onMouseLeave={() => setShowEmojis(false)}
                      >
                        <EmojiPicker
                          onEmojiClick={(emojiData) => { 
                            setInput((prev) => `${prev}${emojiData.emoji}`); 
                            setShowEmojis(false);
                          }}
                          autoFocusSearch={false}
                          searchDisabled
                          skinTonesDisabled
                          lazyLoadEmojis
                          width={320}
                          height={400}
                          previewConfig={{ showPreview: false }}
                          theme="light"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              <motion.button 
                type="button" 
                className="size-6 grid place-items-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Attach file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </motion.button>
            </div>
            
            {/* Input container */}
            <motion.div 
              className="flex-1 relative"
              layout
            >
              <motion.div 
                className={`relative bg-gray-50 rounded-3xl border-2 transition-all duration-300 ${
                  input.trim() ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                } focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10`}
                layout
              >
                <div className="flex items-end">
                  <AutoGrowTextarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    onSend={send}
                    onBlur={() => socketRef.current?.emit('typing', { to: otherId, isTyping: false })}
                  />
                  
                  {/* Voice message button when input is empty */}
                  <AnimatePresence>
                    {!input.trim() && (
                      <motion.button
                        type="button"
                        className="size-6 grid place-items-center rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-100 transition-all mr-3 mb-3 flex-shrink-0"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        aria-label="Voice message"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>

            {/* Send button */}
            <motion.button
              type="submit"
              className={`size-12 grid place-items-center rounded-full shadow-lg transition-all duration-300 ${
                input.trim() 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-blue-500/30' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!input.trim()}
              whileHover={input.trim() ? { scale: 1.1, rotate: 15 } : {}}
              whileTap={input.trim() ? { scale: 0.95 } : {}}
              layout
              aria-label="Send message"
            >
              <motion.svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="size-5"
                animate={input.trim() ? { x: 1 } : { x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
              </motion.svg>
            </motion.button>
          </motion.form>
        </div>
      </motion.div>

      {/* Scroll-to-bottom button when not at bottom */}
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 1000; }}
            className="absolute right-4 bottom-24 size-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white grid place-items-center shadow-lg hover:shadow-xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            aria-label="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

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
        localStream={callManager?.localStream}
      />

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={!!videoCallState}
        type={videoCallState?.type}
        callerName={videoCallState?.callerName}
        status={videoCallState?.status}
        onAnswer={answerVideoCall}
        onDecline={declineVideoCall}
        onEndCall={endVideoCall}
        onToggleMute={toggleVideoMute}
        onToggleCamera={toggleCamera}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Hidden video elements for video calls */}
      <video ref={localVideoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <video ref={remoteVideoRef} style={{ display: 'none' }} autoPlay playsInline />
    </motion.div>
  );
}
