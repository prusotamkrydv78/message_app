'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallModal({ 
  isOpen, 
  type, // 'outgoing' | 'incoming' | 'connected'
  callerName, 
  status, // 'calling' | 'ringing' | 'connected' | 'ended'
  onAnswer, 
  onDecline, 
  onEndCall,
  onToggleMute 
}) {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
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
    setMuted(newMuted);
  };


  // Full screen modal component
  const FullScreenModal = () => (
    <motion.div 
      className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      
      {/* Animated background pattern */}
      <motion.div 
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <motion.div 
          className="absolute inset-0 opacity-20"
          animate={{ 
            backgroundPosition: ['0% 0%', '100% 100%'] 
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)`,
            backgroundSize: '400px 400px'
          }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center text-white">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className="size-28 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 grid place-items-center text-3xl font-bold mx-auto shadow-lg border-4 border-white/50 text-gray-700">
            {callerName?.[0]?.toUpperCase() || "U"}
          </div>
          {status === 'ringing' && (
            <motion.div 
              className="absolute inset-0 rounded-full border-4 border-blue-400"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Name and Status */}
        <div className="mb-8">
          <div className="text-2xl font-bold mb-2">{callerName || "Unknown"}</div>
          <div className="text-sm font-medium">
            {status === 'calling' && (
              <span className="text-blue-200">Calling...</span>
            )}
            {status === 'ringing' && (
              <span className="text-green-200">Incoming call</span>
            )}
            {status === 'connected' && (
              <span className="text-green-200 font-mono text-lg">{formatDuration(duration)}</span>
            )}
            {status === 'ended' && (
              <span className="text-gray-300">Call ended</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6">
          {type === 'incoming' && status === 'ringing' && (
            <>
              <button
                onClick={onDecline}
                className="size-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
                aria-label="Decline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={onAnswer}
                className="size-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
                aria-label="Answer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
                </svg>
              </button>
            </>
          )}

          {(type === 'outgoing' || status === 'connected') && (
            <>
              {status === 'connected' && (
                <button
                  onClick={handleMute}
                  className={`size-14 rounded-full grid place-items-center shadow-lg transition-colors hover:scale-110 ${
                    muted ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
                  }`}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                    {muted ? (
                      <path d="M3.53 2.47a.75.75 0 00-1.06 1.06L9.75 10.81V15a3.75 3.75 0 007.5 0v-.207l1.72 1.72c-.455.403-.974.753-1.533 1.03a.75.75 0 10.626 1.364 9.723 9.723 0 002.343-1.542l1.14 1.14a.75.75 0 101.06-1.06L3.53 2.47zM15 12.75a3.75 3.75 0 01-7.5 0v-3.44L15 16.81V12.75z" />
                    ) : (
                      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v4.565a3 3 0 11-1.5 0V4.5a2.25 2.25 0 10-4.5 0v4.565a3 3 0 11-1.5 0V4.5z" />
                    )}
                  </svg>
                </button>
              )}
              <button
                onClick={onEndCall}
                className="size-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
                aria-label="End call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && <FullScreenModal />}
    </AnimatePresence>
  );
}
