"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Users, Settings, MoreVertical, Crown, UserPlus, User } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { ScrollArea } from "../../components/ui/scroll-area";
import Link from "next/link";
import BottomNav from "../../components/ui/bottom-nav";

function TopBar({ onLogout, user }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-16 px-3 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Groups
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your group chats</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/profile" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs sm:text-sm px-2 sm:px-3">
            Logout
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

function GroupCard({ group, index }) {
  const getInitials = (name) => {
    if (!name) return "G";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/groups/${group.id}`}>
        <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 sm:hover:-translate-y-0.5 active:scale-[0.98] sm:active:scale-100 bg-white/80 backdrop-blur-sm border-0 cursor-pointer">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                  <AvatarFallback className="bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium text-sm sm:text-base">
                    {getInitials(group.name)}
                  </AvatarFallback>
                </Avatar>
                {group.isAdmin && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground truncate flex items-center gap-1 sm:gap-2">
                    {group.name}
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  </h3>
                  {group.lastActivity && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {new Date(group.lastActivity).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {group.memberCount} members
                  </p>
                  {group.unreadCount > 0 && (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-medium">
                        {group.unreadCount > 9 ? "9+" : group.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading, logout, accessToken } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!accessToken) return;
      setLoadingGroups(true);
      try {
        // Mock data for now - replace with actual API call
        const mockGroups = [
          {
            id: "1",
            name: "Team Alpha",
            memberCount: 8,
            isAdmin: true,
            lastActivity: new Date().toISOString(),
            unreadCount: 3
          },
          {
            id: "2", 
            name: "Project Beta",
            memberCount: 12,
            isAdmin: false,
            lastActivity: new Date(Date.now() - 86400000).toISOString(),
            unreadCount: 0
          },
          {
            id: "3",
            name: "Design Team",
            memberCount: 5,
            isAdmin: true,
            lastActivity: new Date(Date.now() - 172800000).toISOString(),
            unreadCount: 1
          }
        ];
        if (!abort) setGroups(mockGroups);
      } catch (e) {
        if (!abort) setGroups([]);
      } finally {
        if (!abort) setLoadingGroups(false);
      }
    })();
    return () => { abort = true; };
  }, [accessToken]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto max-w-4xl h-[100dvh] flex flex-col">
        <TopBar onLogout={logout} user={user} />

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-3 sm:px-4 py-3 bg-white/50"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>
        </motion.div>

        {/* Groups List */}
        <div className="flex-1 overflow-hidden">
          <div className="px-3 sm:px-4 py-3 flex items-center justify-between bg-white/30">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground">Your Groups</h3>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Group</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          <ScrollArea className="h-full" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="p-3 sm:p-4">
              <AnimatePresence>
                {loadingGroups ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading groups...</p>
                  </motion.div>
                ) : filteredGroups.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center justify-center py-12 sm:py-16"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                      <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      {searchQuery ? "No groups found" : "No groups yet"}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6 max-w-sm px-4">
                      {searchQuery 
                        ? "Try adjusting your search terms"
                        : "Create or join a group to start collaborating"
                      }
                    </p>
                    {!searchQuery && (
                      <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 h-10 sm:h-11 text-sm sm:text-base px-4 sm:px-6">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Group
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {filteredGroups.map((group, index) => (
                      <GroupCard key={group.id} group={group} index={index} />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Floating Action Button */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="fixed bottom-6 right-6"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Button
            size="lg"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </motion.div>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
