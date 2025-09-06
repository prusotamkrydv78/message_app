"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import BottomNav from "../../../components/ui/bottom-nav";

export default function NewChatPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const listRef = useRef(null);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [countryCode, setCountryCode] = useState("+977");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Please provide a phone number");
      return;
    }
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await api.createContact(accessToken, { countryCode: countryCode.trim() || "+977", phoneNumber: phoneNumber.trim() });
      setSuccess("Contact saved" + (res.conversationId ? ", opening chat..." : "."));
      // Navigate to chat list (or later, open the specific conversation)
      router.replace("/chat");
    } catch (e) {
      setError(e.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex-1 grid place-items-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <header className={`sticky top-0 z-10 bg-white/95 backdrop-blur ${headerElevated ? 'shadow-md' : ''}`}>
        <div className="h-14 px-4 flex items-center gap-2">
          <Link href="/chat" className="size-10 grid place-items-center rounded-md hover:bg-gray-50" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="text-[16px] font-semibold">Add Contact</div>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <form onSubmit={onSubmit} className="p-4 space-y-4 max-w-md">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                className="w-full h-11 px-3 rounded-xl bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="+977"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input
                className="w-full h-11 px-4 rounded-xl bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., 9812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-emerald-600">{success}</div>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-5 rounded-full bg-black text-white disabled:opacity-60 active:scale-95 transition-transform"
            >
              {submitting ? 'Saving...' : 'Save & Start Chat'}
            </button>
          </div>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
