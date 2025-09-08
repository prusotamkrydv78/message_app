"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Bell, Shield, Palette, ChevronRight, LogOut, Camera } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Card, CardContent } from "../../components/ui/card";
import BottomNav from "../../components/ui/bottom-nav";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-16 px-3 sm:px-4 flex items-center justify-between">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Profile</h1>
          <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-10 sm:w-10 p-0">
            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </motion.header>

      <div className="container mx-auto max-w-2xl p-3 sm:p-4 space-y-4 sm:space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mb-4">
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xl sm:text-2xl font-bold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{user?.name}</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">{user?.countryCode} {user?.phoneNumber}</p>
                <Button variant="outline" className="mb-4 h-9 sm:h-10 text-sm sm:text-base">
                  <Camera className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Settings</h3>
              <div className="space-y-2 sm:space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98] sm:active:scale-100">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="font-medium text-sm sm:text-base">Notifications</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98] sm:active:scale-100">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="font-medium text-sm sm:text-base">Privacy</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98] sm:active:scale-100">
                  <div className="flex items-center gap-3">
                    <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="font-medium text-sm sm:text-base">Theme</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full h-11 sm:h-12 font-medium text-sm sm:text-base"
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm sm:text-base">Signing out...</span>
                  </div>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
