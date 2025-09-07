"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { Avatar, AvatarFallback } from "./avatar";

// Inline icons to avoid external icon package initialization issues in production bundles
const IconPhone = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.09 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.81.31 1.6.57 2.34a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.83-1.24a2 2 0 0 1 2.11-.45c.74.26 1.53.45 2.34.57A2 2 0 0 1 22 16.92z"/></svg>
);
const IconPhoneOff = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.66 13.66a12 12 0 0 1-1.32-1.32m-2.76-4.02A16 16 0 0 1 3.09 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.81.31 1.6.57 2.34a2 2 0 0 1-.45 2.11L9 10m6 6 1.24-.83a2 2 0 0 1 2.11-.45c.74.26 1.53.45 2.34.57A2 2 0 0 0 22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-7.95-3.54M1 1l22 22"/></svg>
);
const IconMic = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v11a3 3 0 0 1-6 0"/><path d="M19 8a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const IconMicOff = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M12 1v5"/><path d="M17 8a5 5 0 0 1-5 5"/><path d="M12 19v3"/><path d="M8 22h8"/></svg>
);
const IconVideo = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
);
const IconVideoOff = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10.4V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6.4"/><path d="M22 12l-4-2v4l4-2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

export default function CallModal({ 
  isOpen, 
  type, // 'outgoing' | 'incoming' | 'connected'
  callerName, 
  status, // 'calling' | 'ringing' | 'connected' | 'ended'
  onAnswer, 
  onDecline, 
  onEndCall,
  onToggleMute,
  isVideo = false
}) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval;
    if (status === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    const newMuted = onToggleMute?.();
    setMuted(newMuted ?? !muted);
  };

  const handleVideoToggle = () => {
    setVideoOff(!videoOff);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusText = () => {
    switch (status) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Incoming call';
      case 'connected': return formatDuration(duration);
      case 'ended': return 'Call ended';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-lg">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Name and Status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {callerName || "Unknown"}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              {isVideo && <IconVideo className="w-4 h-4" />}
              {!isVideo && <IconPhone className="w-4 h-4" />}
              {getStatusText()}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center items-center gap-4"
          >
            {type === 'incoming' && status === 'ringing' && (
              <>
                <Button
                  onClick={onDecline}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPhoneOff className="w-8 h-8" />
                </Button>
                <Button
                  onClick={onAnswer}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPhone className="w-8 h-8" />
                </Button>
              </>
            )}

            {(type === 'outgoing' || status === 'connected') && (
              <>
                {status === 'connected' && (
                  <>
                    <Button
                      onClick={handleMute}
                      size="lg"
                      variant={muted ? "destructive" : "secondary"}
                      className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all"
                    >
                      {muted ? <IconMicOff className="w-6 h-6" /> : <IconMic className="w-6 h-6" />}
                    </Button>
                    
                    {isVideo && (
                      <Button
                        onClick={handleVideoToggle}
                        size="lg"
                        variant={videoOff ? "destructive" : "secondary"}
                        className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all"
                      >
                        {videoOff ? <IconVideoOff className="w-6 h-6" /> : <IconVideo className="w-6 h-6" />}
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  onClick={onEndCall}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPhoneOff className="w-8 h-8" />
                </Button>
              </>
            )}
          </motion.div>

          {/* Connection indicator */}
          {status === 'calling' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex justify-center"
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
