"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Plus, Settings, LogOut, Users, MoreVertical, X, Trash2, Check, Clock, UserCheck, User } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/use-toast";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Card, CardContent } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import BottomNav from "../../components/ui/bottom-nav";

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, logout, accessToken } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [unread, setUnread] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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

  useEffect(() => {
    const onNew = async (e) => {
      const { otherId, isInThisChat } = e.detail || {};
      // Only increment unread if the message is not for the currently open conversation tab
      if (!isInThisChat) {
        setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
      }
      if (accessToken) {
        try {
          const res = await api.conversations(accessToken);
          setConversations(res.conversations || []);
        } catch {}
      }
    };
    const onClear = (e) => {
      const { otherId } = e.detail || {};
      if (!otherId) return;
      setUnread((prev) => ({ ...prev, [otherId]: 0 }));
    };
    window.addEventListener("chat:new-message", onNew);
    window.addEventListener("chat:clear-unread", onClear);
    return () => {
      window.removeEventListener("chat:new-message", onNew);
      window.removeEventListener("chat:clear-unread", onClear);
    };
  }, [accessToken]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!accessToken) return;
    
    setDeletingConversation(conversationId);
    setOpenMenuId(null);
    try {
      await api.deleteConversation(accessToken, conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingConversation(null);
    }
  };

  const handleAccept = async (conversation) => {
    // Accept can be called with id or full conversation object; normalize
    const conversationId = typeof conversation === 'string' ? conversation : conversation?.id;
    const ou = typeof conversation === 'string' ? null : conversation?.otherUser;
    const title = ou?.name || `${ou?.countryCode} ${ou?.phoneNumber}`;
    const phone = `${ou?.countryCode || ''} ${ou?.phoneNumber || ''}`.trim();
    const otherId = ou?.id || ou?._id || '';

    setLoadingStates(prev => ({ ...prev, [conversationId]: true }));
    try {
      await api.acceptConversation(accessToken, conversationId);
      toast({
        title: "Request accepted!",
        description: "You can now start chatting with this contact.",
      });
      // Refresh conversations to update the UI
      const res = await api.conversations(accessToken);
      setConversations(res.conversations || []);
      // Redirect to individual chat page with required params for [id]/page.js
      router.push(`/chat/${encodeURIComponent(conversationId)}?otherId=${encodeURIComponent(otherId)}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`);
    } catch (error) {
      console.error('Error accepting conversation:', error);
      toast({
        title: "Failed to accept",
        description: "Could not accept the connection request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const handleDeclineRequest = async (conversationId) => {
    if (!accessToken) return;
    
    setLoadingStates(prev => ({ ...prev, [conversationId]: true }));
    try {
      await api.deleteConversation(accessToken, conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      toast({
        title: "Request declined",
        description: "Connection request has been declined.",
      });
    } catch (error) {
      console.error("Failed to decline request:", error);
      toast({
        title: "Failed to decline",
        description: "Could not decline the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const toggleMenu = (conversationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === conversationId ? null : conversationId);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredConversations = conversations.filter(c => {
    const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
        <div className="h-16 px-3 sm:px-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Messages</h1>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs sm:text-sm px-2 sm:px-3">
              Logout
            </Button>
          </div>
        </div>
      </motion.header>

      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
          <AnimatePresence>
            {conversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/chat/${conv.otherUser?.id || conv.otherId}?name=${encodeURIComponent(conv.otherUser?.name || conv.name || 'User')}&phone=${encodeURIComponent(conv.otherUser?.phoneNumber || conv.phoneNumber || '')}&otherId=${conv.otherUser?.id || conv.otherId}`}
                  className="block"
                >
                  <Card className="relative p-3 sm:p-4 hover:shadow-md transition-all duration-200 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 active:scale-[0.98] sm:active:scale-100">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 sm:w-12 sm:h-12">
                        <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium text-sm">
                          {getInitials(conv.otherUser?.name || conv.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {conv.otherUser?.name || conv.name || `${conv.otherUser?.countryCode || ''} ${conv.otherUser?.phoneNumber || ''}`.trim() || 'User'}
                          </h3>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
                            </span>
                            <button
                              className="p-1 rounded hover:bg-muted"
                              aria-label="Open menu"
                              onClick={(e) => toggleMenu(conv.id, e)}
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {conv.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>
                    </div>

                    {openMenuId === conv.id && (
                      <div
                        className="absolute right-3 top-10 z-10 w-40 bg-white border rounded-md shadow-lg"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 disabled:opacity-60"
                          disabled={deletingConversation === conv.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setConfirmDeleteId(conv.id);
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>

          {conversations.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 sm:py-12 px-4"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No conversations yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">Start a new conversation to get chatting!</p>
              <Link href="/chat/new">
                <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Chatting
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </ScrollArea>
      
        {/* Bottom Navigation for Mobile */}
        <BottomNav />
        
        {/* Delete confirmation dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete conversation?</DialogTitle>
              <DialogDescription>
                This will permanently remove this conversation from your chat list. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirmDeleteId) { setConfirmOpen(false); return; }
                  try {
                    await handleDeleteConversation(confirmDeleteId);
                    toast({ title: 'Conversation deleted' });
                  } catch (err) {
                    toast({ title: 'Failed to delete', description: err?.message || 'Please try again.', variant: 'destructive' });
                  } finally {
                    setConfirmOpen(false);
                    setConfirmDeleteId(null);
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
