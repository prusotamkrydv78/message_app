"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { Avatar, AvatarFallback } from "./avatar";
import { Phone, PhoneMissed, PhoneOff } from "lucide-react";

// Inline icons to avoid external icon package initialization issues in production bundles
const IconPhone = ({ className = "w-4 h-4" }) => (
  <Phone className={className} />
);
const IconPhoneOff = ({ className = "w-4 h-4" }) => (
  <PhoneOff className={className} />
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
  onToggleVideo,
  isVideo = false,
  localStream,
  remoteStream,
}) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
    const newOff = onToggleVideo?.();
    setVideoOff(newOff ?? !videoOff);
  };

  // Attach streams to <video> when present
  useEffect(() => {
    if (!isVideo) return;
    if (remoteVideoRef.current && remoteStream) {
      try {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      } catch {}
    }
    if (localVideoRef.current && localStream) {
      try {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch {}
    }
  }, [isVideo, localStream, remoteStream]);

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
        className="fixed inset-0 z-50 bg-black/90 sm:bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className={`relative w-full h-full sm:h-auto sm:w-full ${isVideo ? 'sm:max-w-4xl' : 'sm:max-w-sm'} bg-white/95 sm:rounded-3xl text-center shadow-2xl border overflow-hidden`}
        >
          {isVideo ? (
            <div className="relative bg-black h-full sm:h-auto">
              {/* Remote video */}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-[calc(100vh-200px)] sm:h-[420px] object-cover bg-black" />
              {/* Local video pip */}
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-24 right-4 sm:bottom-4 w-28 h-20 sm:w-40 sm:h-24 object-cover rounded-lg shadow-lg border border-white/20 bg-black" />

              {/* Bottom panel for mobile */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t sm:static sm:bg-transparent" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
                {/* Name + status */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="py-4"
                >
                  <h2 className="text-lg sm:text-2xl font-bold text-foreground">{callerName || 'Unknown'}</h2>
                  <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm sm:text-base">
                    <IconVideo className="w-4 h-4" />
                    {getStatusText()}
                  </p>
                </motion.div>

                {/* Controls */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex justify-center items-center gap-4 pb-6"
                >
                  {type === 'incoming' && status === 'ringing' ? (
                    <>
                      <Button onClick={onDecline} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg">
                        <IconPhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
                      </Button>
                      <Button onClick={onAnswer} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg">
                        <IconPhone className="w-7 h-7 sm:w-8 sm:h-8" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {status === 'connected' && (
                        <>
                          <Button onClick={handleMute} variant={muted ? 'destructive' : 'secondary'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg">
                            {muted ? <IconMicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <IconMic className="w-5 h-5 sm:w-6 sm:h-6" />}
                          </Button>
                          <Button onClick={handleVideoToggle} variant={videoOff ? 'destructive' : 'secondary'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg">
                            {videoOff ? <IconVideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <IconVideo className="w-5 h-5 sm:w-6 sm:h-6" />}
                          </Button>
                        </>
                      )}
                      <Button onClick={onEndCall} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg">
                        <IconPhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
                      </Button>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-lg">
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-2xl font-bold">
                    {getInitials(callerName)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{callerName || 'Unknown'}</h2>
              <p className="text-muted-foreground flex items-center justify-center gap-2 mb-6">
                <IconPhone className="w-4 h-4" />
                {getStatusText()}
              </p>
              <div className="flex justify-center items-center gap-4">
                {type === 'incoming' && status === 'ringing' ? (
                  <>
                    <Button onClick={onDecline} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg">
                      <IconPhoneOff className="w-8 h-8" />
                    </Button>
                    <Button onClick={onAnswer} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg">
                      <IconPhone className="w-8 h-8" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={onEndCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg">
                    <IconPhoneOff className="w-8 h-8" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
