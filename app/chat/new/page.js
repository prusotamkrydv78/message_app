"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import BottomNav from "../../../components/ui/bottom-nav";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const listRef = useRef(null);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [countryCode, setCountryCode] = useState("+977");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationResult, setValidationResult] = useState(null);

  // track scroll to add subtle shadow to header (must be before any early returns)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setHeaderElevated(el.scrollTop > 2);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const validatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      setError("Please provide a phone number");
      return;
    }
    
    setValidating(true);
    setError("");
    setValidationResult(null);
    
    try {
      const result = await api.validatePhone(accessToken, countryCode.trim() || "+977", phoneNumber.trim());
      setValidationResult(result);
      
      if (!result.isRegistered) {
        setError("This phone number is not registered on ChatX. Only registered users can be added as contacts.");
      }
    } catch (e) {
      setError(e.message || "Failed to validate phone number");
    } finally {
      setValidating(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // First validate if not already validated or if phone number changed
    if (!validationResult || !validationResult.isRegistered) {
      await validatePhoneNumber();
      return;
    }
    
    setError("");
    setSuccess("");
    setSubmitting(true);
    
    try {
      const res = await api.createContact(accessToken, { 
        countryCode: countryCode.trim() || "+977", 
        phoneNumber: phoneNumber.trim(),
        name: validationResult.user?.name || ""
      });
      setSuccess("Contact saved" + (res.conversationId ? ", opening chat..." : "."));
      router.replace("/chat");
    } catch (e) {
      setError(e.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset validation when phone number changes
  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value);
    setValidationResult(null);
    setError("");
  };

  const handleCountryCodeChange = (e) => {
    setCountryCode(e.target.value);
    setValidationResult(null);
    setError("");
  };

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="size-9 grid place-items-center rounded-full hover:bg-white/20 transition-all duration-200" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/>
            </svg>
          </Link>
          <div className="text-[20px] font-bold tracking-tight">Add Contact</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-bounce"></div>
          </div>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Header Section */}
        <div className="bg-gradient-to-b from-blue-600/10 to-transparent px-4 pt-6 pb-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Add New Contact</h1>
            <p className="text-gray-600">Enter a phone number to connect with friends on ChatX</p>
          </div>
        </div>

        <div className="px-4">
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="ccode" className="text-sm font-medium text-gray-700">Country Code</Label>
                <Input 
                  id="ccode" 
                  placeholder="+977" 
                  value={countryCode} 
                  onChange={handleCountryCodeChange}
                  className="text-center mt-1 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                <div className="relative mt-1">
                  <Input 
                    id="phone" 
                    placeholder="e.g., 9812345678" 
                    value={phoneNumber} 
                    onChange={handlePhoneChange}
                    className={`h-12 ${validationResult?.isRegistered ? "border-green-500 focus:ring-green-500 bg-green-50" : ""}`}
                  />
                  {validating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {validationResult?.isRegistered && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-800">User Found</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {validationResult.user?.name ? `${validationResult.user.name} (${validationResult.user.countryCode} ${validationResult.user.phoneNumber})` : `${countryCode} ${phoneNumber}`}
              </p>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">Validation Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-emerald-800">Success</span>
              </div>
              <p className="text-sm text-emerald-700 mt-1">{success}</p>
            </div>
          )}

            <div className="space-y-3">
              {!validationResult?.isRegistered && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={validatePhoneNumber}
                  disabled={validating || !phoneNumber.trim()}
                  className="w-full h-12 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {validating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validate Phone Number
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={submitting || !validationResult?.isRegistered}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Save & Start Chat
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
