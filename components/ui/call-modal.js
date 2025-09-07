'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallModal({ 
  isOpen, 
  type, // 'outgoing' | 'incoming' | 'connected'
  callerName, 
  status, // 'calling' | 'ringing' | 'connected' | 'ended'
  onAnswer, 
  onDecline, 
  onEndCall,
  onToggleMute,
  localStream // Add localStream prop to monitor audio levels
}) {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const animationFrameRef = React.useRef(null);
  // Audio level monitoring effect
  useEffect(() => {
    if (status === 'connected' && localStream && !muted) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(localStream);
        
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        source.connect(analyserRef.current);
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const updateAudioLevel = () => {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255); // Normalize to 0-1
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };
        
        updateAudioLevel();
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    } else {
      setAudioLevel(0);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [status, localStream, muted]);

  useEffect(() => {
    let interval;
    if (status === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    const newMuted = onToggleMute?.();
    if (typeof newMuted === 'boolean') {
      setMuted(newMuted);
    } else {
      setMuted(prev => !prev);
    }
  };


  // Full screen modal component - memoized to prevent re-renders
  const FullScreenModal = React.memo(() => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      
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
        {/* Avatar with Voice Wave Animation */}
        <div className="relative mb-6">
          {/* Voice Wave Animation - only show when connected and speaking */}
          {status === 'connected' && audioLevel > 0.1 && (
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border-2 border-green-400/40"
                  style={{
                    width: `${120 + i * 20}px`,
                    height: `${120 + i * 20}px`,
                  }}
                  animate={{
                    scale: [1, 1 + audioLevel * 0.3, 1],
                    opacity: [0.6, 0.2, 0.6],
                  }}
                  transition={{
                    duration: 0.8 + i * 0.1,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Main Avatar */}
          <motion.div 
            className="relative size-28 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 grid place-items-center text-3xl font-bold mx-auto shadow-lg border-4 border-white/50 text-gray-700 z-10"
            animate={{
              scale: status === 'connected' && audioLevel > 0.1 ? [1, 1 + audioLevel * 0.1, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {callerName?.[0]?.toUpperCase() || "U"}
          </motion.div>
          
          {/* Ringing Animation */}
          {status === 'ringing' && (
            <motion.div 
              className="absolute inset-0 rounded-full border-4 border-blue-400"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              key="ringing-animation"
            />
          )}
        </div>

        {/* Name and Status */}
        <div className="mb-8">
          <div className="text-2xl font-bold mb-2">{callerName || "Unknown"}</div>
          
          {/* Horizontal Wave Animation above timer - Always visible during connected calls */}
          {status === 'connected' && (
            <div className="flex items-center justify-center mb-3 h-8">
              <div className="flex items-center gap-0.5">
                {[...Array(25)].map((_, i) => {
                  const baseHeight = 3;
                  const isActive = audioLevel > 0.05;
                  const waveHeight = isActive ? audioLevel * 25 : 0;
                  const randomVariation = isActive ? Math.sin(i * 0.8) * 8 : 0;
                  const height = baseHeight + waveHeight + randomVariation;
                  
                  // Dynamic gradient based on audio level
                  const gradientIntensity = Math.min(audioLevel * 2, 1);
                  const gradientClass = isActive 
                    ? `bg-gradient-to-t from-cyan-400 via-blue-400 to-purple-500` 
                    : `bg-gradient-to-t from-gray-400 via-gray-300 to-gray-400`;
                  
                  return (
                    <motion.div
                      key={i}
                      className={`w-0.5 ${gradientClass} rounded-full shadow-sm transition-all duration-300`}
                      animate={{
                        height: Math.max(baseHeight, height),
                        opacity: isActive ? [0.7, 1, 0.8, 0.9, 0.7] : 0.4
                      }}
                      transition={{
                        height: { duration: 0.2, ease: "easeOut" },
                        opacity: isActive ? {
                          duration: 0.4 + (i % 4) * 0.1,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.02
                        } : { duration: 0.3 }
                      }}
                      style={{
                        filter: isActive ? `brightness(${1 + gradientIntensity * 0.5}) saturate(${1 + gradientIntensity})` : 'brightness(0.7) saturate(0.5)'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="text-sm font-medium" key={`status-${status}`}>
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
        <div className="flex justify-center gap-6" key={`buttons-${type}-${status}`}>
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
              <motion.button
                onClick={handleMute}
                className={`size-14 rounded-full grid place-items-center shadow-lg transition-all ${
                  muted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                aria-label={muted ? "Unmute" : "Mute"}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                key={`mute-${muted}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                  {muted ? (
                    <path d="M3.53 2.47a.75.75 0 00-1.06 1.06L9.75 10.81V15a3.75 3.75 0 007.5 0v-.207l1.72 1.72c-.455.403-.974.753-1.533 1.03a.75.75 0 10.626 1.364 9.723 9.723 0 002.343-1.542l1.14 1.14a.75.75 0 101.06-1.06L3.53 2.47zM15 12.75a3.75 3.75 0 01-7.5 0v-3.44L15 16.81V12.75z" />
                  ) : (
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v4.565a3 3 0 11-1.5 0V4.5a2.25 2.25 0 10-4.5 0v4.565a3 3 0 11-1.5 0V4.5z" />
                  )}
                </svg>
              </motion.button>
              <motion.button
                onClick={onEndCall}
                className="size-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white grid place-items-center shadow-xl transition-transform"
                aria-label="End call"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.653.349 2.121 1.006l1.943 2.728c.777 1.09.63 2.58-.38 3.42l-1.426 1.12c-.605.476-.07 1.639.78 2.602C9.919 14.08 11.78 15.5 13.5 15.5c.963 0 2.126.565 2.602-.22l1.12-1.426c.84-1.01 2.33-1.157 3.42-.38l2.728 1.943c.657.468 1.006 1.261 1.006 2.121V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
                </svg>
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  ));

  if (!isOpen) return null;

  return <FullScreenModal />;
}
