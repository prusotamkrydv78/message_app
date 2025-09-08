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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border/10 shadow-lg sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-4 py-2">
        <Link 
          href="/chat" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/chat") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium">Chats</span>
        </Link>

        <Link 
          href="/groups" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/groups") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Groups</span>
        </Link>

        <Link 
          href="/chat/new" 
          className="flex flex-col items-center gap-1 p-2"
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium text-primary">New</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive("/profile") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </motion.nav>
  );
}
