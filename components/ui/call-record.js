'use client';

import { motion } from 'framer-motion';

export default function CallRecord({ 
  type, // 'voice' | 'video'
  status, // 'missed' | 'answered' | 'declined' | 'ended'
  duration, // in seconds
  time, // formatted time string
  mine, // boolean - true if I initiated the call
  callerName
}) {
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = () => {
    if (type === 'video') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 5.25a.75.75 0 011.06.75v12a.75.75 0 01-1.06.75l-3.75-3.75V9l3.75-3.75z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.653.349 2.121 1.006l1.943 2.728c.777 1.09.63 2.58-.38 3.42l-1.426 1.12c-.605.476-.07 1.639.78 2.602C9.919 14.08 11.78 15.5 13.5 15.5c.963 0 2.126.565 2.602-.22l1.12-1.426c.84-1.01 2.33-1.157 3.42-.38l2.728 1.943c.657.468 1.006 1.261 1.006 2.121V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'missed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-red-500">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        );
      case 'declined':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-red-500">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        );
      case 'answered':
      case 'ended':
        return mine ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-green-500">
            <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.653.349 2.121 1.006l1.943 2.728c.777 1.09.63 2.58-.38 3.42l-1.426 1.12c-.605.476-.07 1.639.78 2.602C9.919 14.08 11.78 15.5 13.5 15.5c.963 0 2.126.565 2.602-.22l1.12-1.426c.84-1.01 2.33-1.157 3.42-.38l2.728 1.943c.657.468 1.006 1.261 1.006 2.121V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-blue-500 rotate-180">
            <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.653.349 2.121 1.006l1.943 2.728c.777 1.09.63 2.58-.38 3.42l-1.426 1.12c-.605.476-.07 1.639.78 2.602C9.919 14.08 11.78 15.5 13.5 15.5c.963 0 2.126.565 2.602-.22l1.12-1.426c.84-1.01 2.33-1.157 3.42-.38l2.728 1.943c.657.468 1.006 1.261 1.006 2.121V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'missed':
        return mine ? 'Missed call' : 'Missed call';
      case 'declined':
        return mine ? 'Call declined' : 'Declined call';
      case 'answered':
      case 'ended':
        return mine ? 'Outgoing call' : 'Incoming call';
      default:
        return 'Call';
    }
  };

  const durationText = formatDuration(duration);

  return (
    <motion.div 
      className={`w-full flex ${mine ? 'justify-end' : 'justify-start'} mt-2 px-2`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div 
        className={`relative max-w-[65%] rounded-2xl px-3 py-2.5 shadow-sm ${
          mine 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
            : 'bg-white text-gray-800 border border-gray-100'
        }`}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-2.5">
          {/* Call Icon */}
          <div className={`p-1.5 rounded-full ${
            mine ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            <div className={mine ? 'text-white' : 'text-gray-600'}>
              {getCallIcon()}
            </div>
          </div>

          {/* Call Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {getStatusIcon()}
              <span className="text-xs font-medium truncate">
                {getStatusText()}
              </span>
              {type === 'video' && (
                <span className={`text-xs px-1 py-0.5 rounded ${
                  mine ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  Video
                </span>
              )}
            </div>
            
            {durationText && (
              <div className={`text-xs ${
                mine ? 'text-white/70' : 'text-gray-500'
              }`}>
                {durationText}
              </div>
            )}
          </div>
        </div>

        {/* Time */}
        {time && (
          <div className={`text-xs mt-2 ${
            mine ? 'text-white/80' : 'text-gray-500'
          }`}>
            {time}
          </div>
        )}

        {/* Tail */}
        <span
          className={`absolute bottom-0 ${
            mine ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'
          } translate-y-1 w-3 h-3 rounded-bl-[10px] rounded-tr-[10px] ${
            mine 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-white border-l border-b border-gray-100'
          } shadow-[inherit]`}
        />
      </motion.div>
    </motion.div>
  );
}
