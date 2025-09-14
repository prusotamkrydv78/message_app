"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { useToast } from "../../components/ui/use-toast";
import BottomNav from "../../components/ui/bottom-nav";

export default function RequestsPage() {
  const router = useRouter();
  const { user, loading, accessToken } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({});
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const load = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      const res = await api.conversations(accessToken);
      setItems(res.conversations || []);
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [accessToken]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const accept = async (conv) => {
    const id = conv.id;
    setBusy(prev => ({ ...prev, [id]: true }));
    try {
      await api.acceptConversation(accessToken, id);
      toast({ title: "Request accepted" });
      await load();
      const ou = conv.otherUser || {};
      const title = ou.name || `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
      const phone = `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim();
      router.push(`/chat/${encodeURIComponent(id)}?otherId=${encodeURIComponent(ou.id || '')}&name=${encodeURIComponent(title)}&phone=${encodeURIComponent(phone)}`);
    } catch (e) {
      toast({ title: "Failed to accept", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  };

  const cancelOrDecline = async (id) => {
    setBusy(prev => ({ ...prev, [id]: true }));
    try {
      await api.deleteConversation(accessToken, id);
      toast({ title: "Request removed" });
      await load();
    } catch (e) {
      toast({ title: "Failed to remove", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading || !user) return null;

  const incoming = items.filter(i => i.isPending && !i.isRequestedByMe);
  const sent = items.filter(i => i.isPending && i.isRequestedByMe);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="h-16 px-3 sm:px-4 flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Requests</h1>
            <div className="flex items-center gap-2">
              <Link href="/chat">
                <Button variant="ghost" size="sm">Back</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={load} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</Button>
            </div>
          </div>
        </motion.header>

        <div className="p-3 sm:p-4 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
          <section>
            <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Incoming</h2>
            <div className="space-y-2">
              <AnimatePresence>
                {incoming.map((req, idx) => {
                  const title = req.otherUser?.name || `${req.otherUser?.countryCode || ''} ${req.otherUser?.phoneNumber || ''}`.trim();
                  return (
                    <motion.div key={`in-${req.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: idx * 0.03 }}>
                      <Card className="p-3 bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-9 h-9"><AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white">{getInitials(title)}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{title}</div>
                              <div className="text-xs text-muted-foreground">Incoming request</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" disabled={!!busy[req.id]} onClick={() => cancelOrDecline(req.id)}>Decline</Button>
                            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white" disabled={!!busy[req.id]} onClick={() => accept(req)}>
                              {busy[req.id] ? '...' : 'Accept'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
                {incoming.length === 0 && (
                  <div className="text-xs text-muted-foreground">No incoming requests</div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section>
            <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sent</h2>
            <div className="space-y-2">
              <AnimatePresence>
                {sent.map((req, idx) => {
                  const title = req.otherUser?.name || `${req.otherUser?.countryCode || ''} ${req.otherUser?.phoneNumber || ''}`.trim();
                  return (
                    <motion.div key={`out-${req.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: idx * 0.03 }}>
                      <Card className="p-3 bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-9 h-9"><AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white">{getInitials(title)}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{title}</div>
                              <div className="text-xs text-muted-foreground">Waiting for acceptance</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" disabled={!!busy[req.id]} onClick={() => cancelOrDecline(req.id)}>Cancel</Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
                {sent.length === 0 && (
                  <div className="text-xs text-muted-foreground">No sent requests</div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
