'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoCallModal({ 
  isOpen, 
  type, // 'outgoing' | 'incoming' | 'connected'
  callerName, 
  status, // 'calling' | 'ringing' | 'connected' | 'ended'
  onAnswer, 
  onDecline, 
  onEndCall,
  onToggleMute,
  onToggleCamera,
  localVideoRef,
  remoteVideoRef
}) {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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

  const handleCameraToggle = () => {
    const newCameraOff = onToggleCamera?.();
    setCameraOff(newCameraOff);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  // Minimized video call component
  const MinimizedCall = () => (
    <motion.div
      className="fixed top-4 right-4 z-[100] bg-black rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={handleMaximize}
    >
      <div className="relative w-48 h-32">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
        
        {/* Local video (small overlay) */}
        <div className="absolute top-2 right-2 w-12 h-8 bg-gray-800 rounded overflow-hidden">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        </div>

        {/* Duration overlay */}
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {formatDuration(duration)}
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMute();
            }}
            className={`size-8 rounded-full grid place-items-center text-white ${
              muted ? 'bg-red-500' : 'bg-white/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              {muted ? (
                <path d="M3.53 2.47a.75.75 0 00-1.06 1.06L9.75 10.81V15a3.75 3.75 0 007.5 0v-.207l1.72 1.72c-.455.403-.974.753-1.533 1.03a.75.75 0 10.626 1.364 9.723 9.723 0 002.343-1.542l1.14 1.14a.75.75 0 101.06-1.06L3.53 2.47zM15 12.75a3.75 3.75 0 01-7.5 0v-3.44L15 16.81V12.75z" />
              ) : (
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v4.565a3 3 0 11-1.5 0V4.5a2.25 2.25 0 10-4.5 0v4.565a3 3 0 11-1.5 0V4.5z" />
              )}
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEndCall();
            }}
            className="size-8 rounded-full bg-red-500 text-white grid place-items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );

  // Full screen video call component
  const FullScreenVideoCall = () => (
    <motion.div 
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Remote video (full screen background) */}
      <div className="absolute inset-0">
        {status === 'connected' ? (
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="size-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 grid place-items-center text-4xl font-bold mx-auto shadow-lg border-4 border-white/50 text-gray-700 mb-6">
                {callerName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="text-2xl font-bold mb-2">{callerName || "Unknown"}</div>
              <div className="text-lg opacity-80">
                {status === 'calling' && "Calling..."}
                {status === 'ringing' && "Incoming video call"}
                {status === 'ended' && "Call ended"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Local video (small overlay) */}
      {status === 'connected' && (
        <motion.div 
          className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {!cameraOff ? (
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8 text-white">
                <path d="M3.53 2.47a.75.75 0 00-1.06 1.06L9 7.94V9a3 3 0 004.5 2.6l.458-.3L21 18.37a.75.75 0 001.06-1.06L3.53 2.47zM15.75 9.75L12 6H15.75a.75.75 0 01.75.75V9.75z" />
              </svg>
            </div>
          )}
        </motion.div>
      )}

      {/* Top bar with duration and minimize */}
      {status === 'connected' && (
        <motion.div 
          className="absolute top-4 left-4 flex items-center gap-4 z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-mono">
            {formatDuration(duration)}
          </div>
          <button
            onClick={handleMinimize}
            className="size-10 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Bottom controls */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {type === 'incoming' && status === 'ringing' && (
          <>
            <button
              onClick={onDecline}
              className="size-16 rounded-full bg-red-500 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
              aria-label="Decline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={onAnswer}
              className="size-16 rounded-full bg-green-500 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
              aria-label="Answer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.653.349 2.121 1.006l1.943 2.728c.777 1.09.63 2.58-.38 3.42l-1.426 1.12c-.605.476-.07 1.639.78 2.602C9.919 14.08 11.78 15.5 13.5 15.5c.963 0 2.126.565 2.602-.22l1.12-1.426c.84-1.01 2.33-1.157 3.42-.38l2.728 1.943c.657.468 1.006 1.261 1.006 2.121V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
              </svg>
            </button>
          </>
        )}

        {(type === 'outgoing' || status === 'connected') && (
          <>
            <button
              onClick={handleMute}
              className={`size-14 rounded-full grid place-items-center shadow-lg transition-all hover:scale-110 ${
                muted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
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

            <button
              onClick={handleCameraToggle}
              className={`size-14 rounded-full grid place-items-center shadow-lg transition-all hover:scale-110 ${
                cameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              aria-label={cameraOff ? "Turn on camera" : "Turn off camera"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                {cameraOff ? (
                  <path d="M3.53 2.47a.75.75 0 00-1.06 1.06L9 7.94V9a3 3 0 004.5 2.6l.458-.3L21 18.37a.75.75 0 001.06-1.06L3.53 2.47zM15.75 9.75L12 6H15.75a.75.75 0 01.75.75V9.75z" />
                ) : (
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 7.125v-.75z" />
                )}
              </svg>
            </button>

            <button
              onClick={onEndCall}
              className="size-16 rounded-full bg-red-500 text-white grid place-items-center shadow-xl hover:scale-110 transition-transform"
              aria-label="End call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMinimized && status === 'connected' ? (
            <MinimizedCall />
          ) : (
            <FullScreenVideoCall />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
