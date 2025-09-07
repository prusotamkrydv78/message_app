"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "./button";
import { Avatar, AvatarFallback } from "./avatar";

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
              {isVideo && <Video className="w-4 h-4" />}
              {!isVideo && <Phone className="w-4 h-4" />}
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
                  <PhoneOff className="w-8 h-8" />
                </Button>
                <Button
                  onClick={onAnswer}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Phone className="w-8 h-8" />
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
                      {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>
                    
                    {isVideo && (
                      <Button
                        onClick={handleVideoToggle}
                        size="lg"
                        variant={videoOff ? "destructive" : "secondary"}
                        className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all"
                      >
                        {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  onClick={onEndCall}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <PhoneOff className="w-8 h-8" />
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
