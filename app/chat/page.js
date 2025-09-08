"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Plus, Settings, LogOut, Users, MoreVertical, X, Trash2, Check, Clock, UserCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Card, CardContent } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";

function TopBar({ onLogout, user, isSearchExpanded, setIsSearchExpanded }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm border-b border-border/50 px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ChatX</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, logout, accessToken } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [unread, setUnread] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});

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
      const { otherId } = e.detail || {};
      setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col">
        <TopBar onLogout={logout} user={user} isSearchExpanded={isSearchExpanded} setIsSearchExpanded={setIsSearchExpanded} />

        {/* Expandable Search Bar */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 bg-white border-b border-border/20"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 bg-white/80"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setSearchQuery("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Conversations */}
        <div className="flex-1 overflow-hidden pb-20">
          <div className="px-4 py-3 flex items-center justify-between bg-white">
            <h3 className="text-sm font-semibold text-muted-foreground">Chats</h3>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-full">
            <div className="p-4">
              <AnimatePresence>
                {loadingList ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading conversations...</p>
                  </motion.div>
                ) : filteredConversations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                      <MessageCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery ? "No conversations found" : "No chats yet"}
                    </h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      {searchQuery 
                        ? "Try adjusting your search terms"
                        : "Start a conversation to see it here"
                      }
                    </p>
                    {!searchQuery && (
                      <Button 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        onClick={() => router.push('/chat/new')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Start New Chat
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((c, index) => {
                      const title = c.otherUser?.name || `${c.otherUser?.countryCode} ${c.otherUser?.phoneNumber}`;
                      const phone = `${c.otherUser?.countryCode || ''} ${c.otherUser?.phoneNumber || ''}`.trim();
                      const otherId = c.otherUser?.id || c.otherUser?._id || '';
                      const href = c.status === 'accepted' ? `/chat/${c.id}?otherId=${encodeURIComponent(otherId)}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}` : '#';
                      const time = c.lastMessage?.at ? new Date(c.lastMessage.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      const isPending = c.status === 'pending';
                      const isRequestedByMe = c.isRequestedByMe;
                      const canAccept = isPending && !isRequestedByMe;
                      
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative group"
                        >
                          {c.status === 'accepted' ? (
                            <Link href={href}>
                              <Card className="hover:shadow-sm transition-all duration-200 bg-white border-0 shadow-none">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                                        {getInitials(title)}
                                      </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-foreground truncate">
                                          {title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          {time && (
                                            <span className="text-xs text-muted-foreground">
                                              {time}
                                            </span>
                                          )}
                                          <div className="relative">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                              onClick={(e) => toggleMenu(c.id, e)}
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                            
                                            <AnimatePresence>
                                              {openMenuId === c.id && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                  transition={{ duration: 0.1 }}
                                                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-border/20 py-1 z-50"
                                                >
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start px-3 py-2 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteConversation(c.id)}
                                                    disabled={deletingConversation === c.id}
                                                  >
                                                    {deletingConversation === c.id ? (
                                                      <>
                                                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin mr-2" />
                                                        Deleting...
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete Chat
                                                      </>
                                                    )}
                                                  </Button>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <p className="text-sm text-muted-foreground truncate">
                                        {c.lastMessage?.text || 'No messages yet'}
                                      </p>
                                    </div>
                                    
                                    {!!unread[otherId] && (
                                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <span className="text-xs text-primary-foreground font-medium">
                                          {unread[otherId] > 9 ? "9+" : unread[otherId]}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ) : (
                            <Card className={`transition-all duration-200 border ${
                              isPending ? 'border-orange-200 bg-orange-50' : 'border-border bg-white'
                            }`}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    <AvatarFallback className="bg-gradient-to-r from-orange-400 to-red-500 text-white font-medium">
                                      {getInitials(title)}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-foreground truncate">
                                        {title}
                                      </h3>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        <span className="text-xs text-orange-600 font-medium">
                                          {isRequestedByMe ? 'Sent' : 'Received'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {isRequestedByMe 
                                        ? 'Waiting for them to accept your request'
                                        : 'Wants to connect with you'
                                      }
                                    </p>
                                    
                                    {canAccept && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAccept(c)}
                                          disabled={!!loadingStates[c.id]}
                                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                                        >
                                          {loadingStates[c.id] ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                          ) : (
                                            <Check className="w-3 h-3 mr-1" />
                                          )}
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeclineRequest(c.id)}
                                          disabled={!!loadingStates[c.id]}
                                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                                        >
                                          {loadingStates[c.id] ? (
                                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                                          ) : (
                                            <X className="w-3 h-3 mr-1" />
                                          )}
                                          Decline
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {isRequestedByMe && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeclineRequest(c.id)}
                                          disabled={!!loadingStates[c.id]}
                                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                                        >
                                          {loadingStates[c.id] ? (
                                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                                          ) : (
                                            <X className="w-3 h-3 mr-1" />
                                          )}
                                          Cancel Request
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Bottom Mobile Navigation */}
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="mx-4 mb-4 bg-white rounded-2xl shadow-lg border border-border/10"
        >
          <div className="flex items-center justify-between px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 rounded-full p-0 text-primary"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            
            <Button
              size="sm"
              className="bg-black hover:bg-black/90 text-white rounded-full px-6 py-2 h-10"
              onClick={() => router.push('/chat/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 rounded-full p-0 text-muted-foreground hover:text-primary"
              onClick={() => router.push('/profile')}
            >
              <Users className="w-6 h-6" />
            </Button>
          </div>
        </motion.nav>
      </div>
    </div>
  );
}
