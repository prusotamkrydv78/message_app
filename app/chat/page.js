"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import Link from "next/link";
import { api } from "../../lib/api";
import BottomNav from "../../components/ui/bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

function TopBar({ onLogout, onSearchToggle, isSearchOpen }) {
  const { user } = useAuth();
  return (
    <header className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-bounce"></div>
        </div>
        <div className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
          ChatX
        </div>
      </div>
      <button 
        className={`size-9 grid place-items-center rounded-full hover:bg-white/20 transition-all duration-200 ${isSearchOpen ? 'bg-white/20 scale-110' : ''}`} 
        aria-label="Search"
        onClick={onSearchToggle}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
      </button>
    </header>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, logout, accessToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unread, setUnread] = useState({}); // { otherId: count }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!accessToken) return;
      setLoadingList(true);
      try {
        const res = await api.conversations(accessToken);
        if (!abort) setConversations(res.conversations || []);
      } catch (e) {
        if (!abort) setConversations([]);
      } finally {
        if (!abort) setLoadingList(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [accessToken]);

  const openDeleteDialog = (conversationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;
    
    setDeletingId(conversationToDelete);
    try {
      await api.deleteConversation(accessToken, conversationToDelete);
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      alert('Failed to delete conversation: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
    const phone = `${c.otherUser?.countryCode || ''} ${c.otherUser?.phoneNumber || ''}`.trim();
    const lastMessage = c.lastMessage?.text || '';
    
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Listen for global new-message events to update list + unread counts
  useEffect(() => {
    const onNew = async (e) => {
      const { otherId } = e.detail || {};
      // increment unread badge
      setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
      // refresh conversations to bring latest message to top
      if (accessToken) {
        try {
          const res = await api.conversations(accessToken);
          setConversations(res.conversations || []);
        } catch {}
      }
    };
    window.addEventListener("chat:new-message", onNew);
    return () => window.removeEventListener("chat:new-message", onNew);
  }, [accessToken]);

  if (loading) return (
    <div className="flex-1 grid place-items-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin mx-auto">
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-lg font-semibold text-gray-700 mb-2">Loading ChatX...</div>
        <div className="text-sm text-gray-500">Preparing your messaging experience</div>
      </div>
    </div>
  );
  if (!user) return null;

  // Derive a small set for stories (mocked from conversations' other users)
  const storyUsers = conversations.slice(0, 8).map((c) => c.otherUser).filter(Boolean);

  return (
    <motion.div 
      className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <TopBar onLogout={logout} onSearchToggle={toggleSearch} isSearchOpen={isSearchOpen} />
      
      {/* Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="relative"
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                autoFocus
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Active Users - Only show when not searching and have conversations */}
        <AnimatePresence>
          {!isSearchOpen && conversations.length > 0 && (
            <motion.section 
              className="px-4 pt-4 pb-6 bg-white/50 backdrop-blur-sm border-b border-gray-100"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Active Now</h3>
                <Link href="/chat/new" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Add Contact</Link>
              </div>
              <motion.div 
                className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {conversations.slice(0, 8).map((c, index) => {
                const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
                const otherId = c.otherUser?.id || c.otherUser?._id || '';
                const href = `/chat/${c.id}?otherId=${encodeURIComponent(otherId)}&name=${encodeURIComponent(title)}`;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href={href} className="shrink-0 flex flex-col items-center gap-2">
                      <div className="relative">
                        <Avatar className="w-14 h-14 ring-2 ring-white shadow-lg">
                          <AvatarImage src={c.otherUser?.profilePic} alt={title} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                            {title.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <motion.div 
                          className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      <span className="text-xs text-gray-700 max-w-[56px] truncate font-medium">{title.split(' ')[0]}</span>
                    </Link>
                  </motion.div>
                );
                })}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Chats heading */}
        <motion.div 
          className="px-4 pt-4 pb-2 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-gray-800">Recent Chats</h3>
          <motion.button 
            className="size-10 grid place-items-center rounded-full hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="More"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-gray-600">
              <path d="M12 6.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM12 13.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM12 19.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
            </svg>
          </motion.button>
        </motion.div>

        {/* Chats list */}
        <div>
          {loadingList && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Loading your chats...</div>
                <div className="text-sm text-gray-500">Please wait while we fetch your conversations</div>
              </div>
              
              {/* Skeleton Loading Cards */}
              <div className="space-y-3 mt-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {!loadingList && filteredConversations.map((c, index) => {
              const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
              const phone = `${c.otherUser?.countryCode || ''} ${c.otherUser?.phoneNumber || ''}`.trim();
              const otherId = c.otherUser?.id || c.otherUser?._id || '';
              const href = `/chat/${c.id}?otherId=${encodeURIComponent(otherId)}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`;
              const time = c.lastMessage?.at ? new Date(c.lastMessage.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <motion.div 
                  key={c.id} 
                  className="relative group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: "rgba(249, 250, 251, 0.8)" }}
                >
                  <Link href={href} className="block px-4 py-4 transition-colors">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="flex-shrink-0"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Avatar className="w-14 h-14 ring-2 ring-gray-100 shadow-sm">
                          <AvatarImage src={c.otherUser?.profilePic} alt={title} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                            {title.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                     
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-gray-900 truncate text-base">{title}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 font-medium">{time}</div>
                            <div className="relative">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === c.id ? null : c.id);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                                    <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                  </svg>
                                </Button>
                              </motion.div>
                              <AnimatePresence>
                                {openMenuId === c.id && (
                                  <motion.div 
                                    className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[140px] overflow-hidden"
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none h-10 font-medium"
                                      onClick={(e) => openDeleteDialog(c.id, e)}
                                      disabled={deletingId === c.id}
                                    >
                                      {deletingId === c.id ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full mr-3" />
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 mr-3">
                                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      Delete Chat
                                    </Button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 truncate">{c.lastMessage?.text || 'No messages yet'}</div>
                      </div>
                      {!!unread[otherId] && (
                        <motion.span 
                          className="ml-2 inline-grid place-items-center min-w-6 h-6 px-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                        >
                          {unread[otherId]}
                        </motion.span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
          {!loadingList && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No conversations yet</h3>
              <p className="text-gray-500 text-center mb-6 max-w-sm">
                Start your first conversation by adding a contact. Connect with friends and family on ChatX!
              </p>
              <Link 
                href="/chat/new" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Contact
              </Link>
            </div>
          )}
          {!loadingList && conversations.length > 0 && filteredConversations.length === 0 && searchQuery && (
            <div className="p-4 text-sm text-gray-500">No conversations found matching "{searchQuery}"</div>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
              {deletingId ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
