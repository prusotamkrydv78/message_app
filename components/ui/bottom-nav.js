"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  
  const isActive = (path) => {
    if (path === "/chat") {
      return pathname === "/chat" || pathname.startsWith("/chat/");
    }
    return pathname === path;
  };

  return (
    <nav className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-gray-200/50 shadow-lg">
      <div className="h-16 px-4 flex items-center justify-between max-w-md mx-auto">
        {/* Home/Chat */}
        <Link 
          href="/chat" 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            isActive("/chat") 
              ? "bg-gradient-to-t from-blue-50 to-purple-50 text-blue-600" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="Chats"
        >
          <div className={`relative ${isActive("/chat") ? "scale-110" : ""} transition-transform duration-200`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-6">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {isActive("/chat") && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <span className="text-[10px] font-medium">Chats</span>
        </Link>

        {/* New Chat - Floating Action Button */}
        <Link 
          href="/chat/new" 
          className="relative group"
          aria-label="New Chat"
        >
          <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* Profile */}
        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
            isActive("/profile") 
              ? "bg-gradient-to-t from-blue-50 to-purple-50 text-blue-600" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="Profile"
        >
          <div className={`relative ${isActive("/profile") ? "scale-110" : ""} transition-transform duration-200`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-6">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            {isActive("/profile") && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
