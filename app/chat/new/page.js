"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, UserPlus, ArrowLeft, Check, PhoneCall, Video } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { useToast } from "../../../components/ui/use-toast";
import { CallManager } from "../../../lib/webrtc";
import { getSocket } from "../../../lib/socket";
import CallModal from "../../../components/ui/call-modal";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+977");
  const [validatedUser, setValidatedUser] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [callManager, setCallManager] = useState(null);
  const [callState, setCallState] = useState(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Initialize call manager
  useEffect(() => {
    if (!accessToken || !user?.id) return;
    
    const s = getSocket(accessToken);
    if (!s) {
      console.error('Failed to get socket connection');
      return;
    }

    const cm = new CallManager(s, user.id);
    
    cm.onIncomingCall = (from, offer) => {
      // Only show call modal if it's from the validated user
      if (validatedUser && String(from) === String(validatedUser.id || validatedUser._id)) {
        setCallState({ 
          type: 'incoming', 
          otherId: from, 
          status: 'ringing', 
          callerName: validatedUser.name,
          offer,
          isVideo: cm.currentCall?.isVideo || false
        });
      }
    };
    
    cm.onCallStateChange = (status) => {
      setCallState(prev => {
        if (!prev && status === 'calling') {
          // Initialize outgoing call state
          return { 
            type: 'outgoing', 
            otherId: validatedUser?.id || validatedUser?._id, 
            status, 
            callerName: validatedUser?.name,
            isVideo: cm.currentCall?.isVideo || false
          };
        }
        if (prev) {
          const newState = { ...prev, status };
          if (status === 'connected' && cm.remoteStream && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = cm.remoteStream;
            remoteAudioRef.current.play().catch(console.error);
          }
          if (status === 'ended' || status === 'declined') {
            return null;
          }
          return newState;
        }
        return prev;
      });
    };
    
    cm.onCallError = (error) => {
      console.error('Call error:', error);
      setCallState(null);
      toast({
        title: "Call failed",
        description: error,
        variant: "destructive",
      });
    };
    
    // Add debug logging
    console.log('CallManager initialized:', !!cm);
    setCallManager(cm);
    
    return () => {
      if (cm.currentCall) {
        cm.endCall();
      }
    };
  }, [accessToken, user?.id, toast]); // Removed validatedUser dependency

  // Auto-validate phone number when 10 digits are entered
  useEffect(() => {
    if (phoneNumber.length === 10 && /^[0-9]{10}$/.test(phoneNumber)) {
      validatePhoneNumber();
    } else {
      setValidatedUser(null);
    }
  }, [phoneNumber, countryCode]);

  const validatePhoneNumber = async () => {
    if (!accessToken || phoneNumber.length !== 10) return;
    
    setIsValidating(true);
    try {
      const res = await api.validatePhone(accessToken, countryCode, phoneNumber);
      if (res.isRegistered) {
        // Check if user is trying to add themselves
        if (res.user.id === user?.id) {
          setValidatedUser(null);
          toast({
            title: "Cannot add yourself",
            description: "You cannot send a connection request to your own phone number",
            variant: "destructive",
          });
          return;
        }
        setValidatedUser(res.user);
      } else {
        setValidatedUser(null);
        toast({
          title: "User not found",
          description: "This phone number is not registered on ChatX",
          variant: "destructive",
        });
      }
    } catch (error) {
      setValidatedUser(null);
      toast({
        title: "Validation failed",
        description: "Could not validate phone number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const sendConnectionRequest = async (targetUser) => {
    if (!accessToken || !targetUser) return;
    
    setIsRequesting(true);
    try {
      const res = await api.startConversation(accessToken, targetUser.id || targetUser._id);
      toast({
        title: "Request sent!",
        description: `Connection request sent to ${targetUser.name || targetUser.phoneNumber}. Wait for them to accept.`,
      });
      // Reset form
      setPhoneNumber("");
      setValidatedUser(null);
      
      // Redirect to chat page after sending request
      router.push('/chat');
    } catch (error) {
      toast({
        title: "Request failed",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?"; 
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleVoiceCall = async () => {
    if (!callManager || !validatedUser) return;
    try {
      await callManager.startCall(validatedUser.id || validatedUser._id, false);
    } catch (error) {
      toast({
        title: "Call failed",
        description: "Could not start voice call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVideoCall = async () => {
    if (!callManager || !validatedUser) return;
    try {
      await callManager.startCall(validatedUser.id || validatedUser._id, true);
    } catch (error) {
      toast({
        title: "Call failed",
        description: "Could not start video call. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col bg-white">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-border/50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Add New Contact</h1>
              <p className="text-xs text-muted-foreground">Send a connection request to start chatting</p>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 h-full overflow-y-auto"
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Add by Phone Number</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter a 10-digit phone number to find and connect with users
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
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
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setPhoneNumber(value);
                          }}
                          className="pl-10 h-11"
                          placeholder="Enter 10-digit phone number"
                          maxLength={10}
                        />
                        {isValidating && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {validatedUser && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {phoneNumber.length}/10 digits • Auto-validates at 10 digits
                    </p>
                  </div>

                  {/* Validated User Card */}
                  <AnimatePresence>
                    {validatedUser && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-6"
                      >
                        <Card className="border border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="w-12 h-12">
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                                  {getInitials(validatedUser.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="font-semibold">{validatedUser.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {validatedUser.countryCode} {validatedUser.phoneNumber}
                                </p>
                              </div>
                              <div className="text-green-600">
                                <Check className="w-5 h-5" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Button
                                onClick={() => sendConnectionRequest(validatedUser)}
                                disabled={isRequesting}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                              >
                                {isRequesting ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Sending Request...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Send Connection Request
                                  </>
                                )}
                              </Button>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleVoiceCall}
                                  disabled={!callManager || !!callState}
                                  variant="outline"
                                  className="flex-1 border-green-200 hover:bg-green-50 text-green-700 hover:text-green-800 disabled:opacity-50"
                                >
                                  <PhoneCall className="w-4 h-4 mr-2" />
                                  {callState ? 'In Call' : 'Voice Call'}
                                </Button>
                                <Button
                                  onClick={handleVideoCall}
                                  disabled={!callManager || !!callState}
                                  variant="outline"
                                  className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700 hover:text-blue-800 disabled:opacity-50"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  {callState ? 'In Call' : 'Video Call'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={!!callState}
        type={callState?.type}
        callerName={callState?.callerName}
        status={callState?.status}
        isVideo={callState?.isVideo}
        onAnswer={() => callManager?.answerCall(callState?.offer)}
        onDecline={() => callManager?.declineCall()}
        onEndCall={() => callManager?.endCall()}
        onToggleMute={() => callManager?.toggleMute()}
      />

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
}
