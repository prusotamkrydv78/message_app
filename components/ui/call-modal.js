"use client";
import { useEffect, useState } from "react";

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
  const [muted, setMuted] = useState(false);
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
    setMuted(newMuted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        {/* Avatar */}
        <div className="size-24 rounded-full bg-gray-200 grid place-items-center text-2xl font-bold mx-auto mb-4">
          {callerName?.[0] || "U"}
        </div>

        {/* Name and Status */}
        <div className="mb-6">
          <div className="text-xl font-semibold mb-1">{callerName || "Unknown"}</div>
          <div className="text-sm text-gray-600">
            {status === 'calling' && 'Calling...'}
            {status === 'ringing' && 'Incoming call'}
            {status === 'connected' && formatDuration(duration)}
            {status === 'ended' && 'Call ended'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {type === 'incoming' && status === 'ringing' && (
            <>
              <button
                onClick={onDecline}
                className="size-16 rounded-full bg-red-500 text-white grid place-items-center shadow-lg active:scale-95"
                aria-label="Decline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path d="M9.5 6.5v3a1.5 1.5 0 0 1-1.5 1.5h-3C3.5 11 2 9.5 2 8V6.5C2 5.5 2.5 5 3.5 5H8c.8 0 1.5.7 1.5 1.5zM21.5 6.5V8c0 1.5-1.5 3-3 3h-3a1.5 1.5 0 0 1-1.5-1.5v-3C14 5.7 14.7 5 15.5 5h3c1 0 3 .5 3 1.5z"/>
                  <path d="M8.5 11.5c-.3.8-.5 1.6-.5 2.5 0 4.1 3.4 7.5 7.5 7.5.9 0 1.7-.2 2.5-.5"/>
                </svg>
              </button>
              <button
                onClick={onAnswer}
                className="size-16 rounded-full bg-green-500 text-white grid place-items-center shadow-lg active:scale-95"
                aria-label="Answer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0122 16.92z"/>
                </svg>
              </button>
            </>
          )}

          {(type === 'outgoing' || status === 'connected') && (
            <>
              {status === 'connected' && (
                <button
                  onClick={handleMute}
                  className={`size-14 rounded-full grid place-items-center shadow-lg active:scale-95 ${
                    muted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                    {muted ? (
                      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1a1 1 0 0 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 2 0zM12 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1z"/>
                    ) : (
                      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1a1 1 0 0 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 2 0zM12 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1z"/>
                    )}
                  </svg>
                </button>
              )}
              <button
                onClick={onEndCall}
                className="size-16 rounded-full bg-red-500 text-white grid place-items-center shadow-lg active:scale-95"
                aria-label="End call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.63 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0122 16.92z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
