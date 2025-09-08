"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { useToast } from "../../../components/ui/use-toast";

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
  }, [accessToken, countryCode, phoneNumber, toast, user?.id]);

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

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Add by Phone Number</h1>
              <p className="text-sm text-muted-foreground">Enter a 10-digit phone number to send a request.</p>
            </div>

            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm w-24"
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
                className="h-11"
                placeholder="10-digit phone number"
                maxLength={10}
              />
              <Button onClick={validatePhone} disabled={isValidating} className="h-11 min-w-24">
                {isValidating ? "Checking..." : "Check"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{phoneNumber.length}/10 digits</p>

            {foundUser && (
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                      {getInitials(foundUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{foundUser.name}</div>
                    <div className="text-sm text-muted-foreground">{foundUser.countryCode} {foundUser.phoneNumber}</div>
                  </div>
                  <Button onClick={sendRequest} disabled={isRequesting}>
                    {isRequesting ? "Sending..." : "Send Request"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
