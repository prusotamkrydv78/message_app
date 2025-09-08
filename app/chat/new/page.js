"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { useToast } from "../../../components/ui/use-toast";
import BottomNav from "../../../components/ui/bottom-nav";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+977");
  const [foundUser, setFoundUser] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const validatePhone = useCallback(async () => {
    if (!accessToken) return;
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      toast({ title: "Enter 10 digits", variant: "destructive" });
      return;
    }
    setIsValidating(true);
    try {
      const res = await api.validatePhone(accessToken, countryCode, digitsOnly);
      if (!res.isRegistered) {
        setFoundUser(null);
        toast({ title: "User not found", description: "This phone number is not registered.", variant: "destructive" });
        return;
      }
      if (String(res.user.id || res.user._id) === String(user?.id || user?._id)) {
        setFoundUser(null);
        toast({ title: "Cannot add yourself", variant: "destructive" });
        return;
      }
      setFoundUser(res.user);
    } catch (e) {
      setFoundUser(null);
      toast({ title: "Validation failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  }, [accessToken, countryCode, phoneNumber, toast, user?.id, user?._id]);

  const sendRequest = useCallback(async () => {
    if (!accessToken || !foundUser) return;
    setIsRequesting(true);
    try {
      await api.startConversation(accessToken, foundUser.id || foundUser._id);
      toast({ title: "Request sent", description: `Sent to ${foundUser.name || foundUser.phoneNumber}` });
      setPhoneNumber("");
      setFoundUser(null);
      router.push("/chat");
    } catch (e) {
      toast({ title: "Request failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  }, [accessToken, foundUser, router, toast]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
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
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">New Chat</h1>
          <div className="w-9 sm:w-10"></div>
        </div>
      </motion.header>

      <div className="container mx-auto max-w-2xl p-3 sm:p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Add by Phone Number</h2>
                <p className="text-sm text-muted-foreground">Enter a 10-digit phone number to send a request.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm w-full sm:w-24 h-10 sm:h-11"
                >
                  <option value="+977">+977</option>
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                </select>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                  placeholder="10-digit phone number"
                  maxLength={10}
                />
                <Button 
                  onClick={validatePhone} 
                  disabled={isValidating} 
                  className="h-10 sm:h-11 min-w-20 sm:min-w-24 text-sm sm:text-base"
                >
                  {isValidating ? "Checking..." : "Check"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{phoneNumber.length}/10 digits</p>

              {foundUser && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border rounded-lg p-3 sm:p-4 bg-green-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium text-sm sm:text-base">
                        {getInitials(foundUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">{foundUser.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{foundUser.countryCode} {foundUser.phoneNumber}</div>
                    </div>
                    <Button 
                      onClick={sendRequest} 
                      disabled={isRequesting}
                      className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
                    >
                      {isRequesting ? "Sending..." : "Send Request"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
