"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle, Plus, User, Users } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === "/chat" && (pathname === "/chat" || pathname.startsWith("/chat/"))) {
      return true;
    }
    return pathname === path;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-border/10 shadow-lg sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-4 py-2">
        <Link 
          href="/chat" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/chat") ? "text-orange-500" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className={`w-5 h-5 ${isActive("/chat") ? 'text-orange-500' : ''}`} />
          <span className="text-xs font-medium">Chats</span>
        </Link>

        <Link 
          href="/groups" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/groups") ? "text-orange-500" : "text-muted-foreground"
          }`}
        >
          <Users className={`w-5 h-5 ${isActive("/groups") ? 'text-orange-500' : ''}`} />
          <span className="text-xs font-medium">Groups</span>
        </Link>

        <Link 
          href="/chat/new" 
          className="flex flex-col items-center gap-1 p-2"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-orange-500/30 transition-all">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">New</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/profile") ? "text-orange-500" : "text-muted-foreground"
          }`}
        >
          <User className={`w-5 h-5 ${isActive("/profile") ? 'text-orange-500' : ''}`} />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </motion.nav>
  );
}
