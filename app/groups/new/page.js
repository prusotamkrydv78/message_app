"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "../../../components/ui/card";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { useToast } from "../../../components/ui/use-toast";

export default function NewGroupPage() {
  const router = useRouter();
  const { accessToken, user, loading } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]); // [{id, name, phone}]
  const [selected, setSelected] = useState({}); // id -> true
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken) return;
      try {
        const res = await api.conversations(accessToken);
        const list = (res.conversations || [])
          .filter(c => c.status === 'accepted' || !c.isPending)
          .map(c => {
            const ou = c.otherUser || {};
            return {
              id: ou.id || ou._id || c.otherId,
              name: ou.name || c.name || `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim() || 'User',
              phone: `${ou.countryCode || ''} ${ou.phoneNumber || ''}`.trim(),
            };
          })
          .filter(u => u.id && String(u.id) !== String(user?.id));
        if (active) setContacts(list);
      } catch (err) {
        if (active) setContacts([]);
      }
    })();
    return () => { active = false; };
  }, [accessToken, user?.id]);

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    const memberIds = Object.keys(selected).filter(id => selected[id]);
    setSubmitting(true);
    try {
      const res = await api.createGroup(accessToken, { name: name.trim(), memberIds });
      toast({ title: "Group created" });
      router.replace(`/groups/${encodeURIComponent(res.id)}`);
    } catch (err) {
      toast({ title: "Failed to create group", description: err?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 flex justify-center">
      <div className="w-full max-w-2xl p-4">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <Link href="/groups"><Button variant="ghost">Back</Button></Link>
          <h1 className="text-lg font-semibold">Create Group</h1>
          <div />
        </motion.header>
        <Card className="p-4 bg-white/90 space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Group name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Plan" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Add people</label>
                <span className="text-xs text-muted-foreground">Selected: {Object.values(selected).filter(Boolean).length}</span>
              </div>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your chats…" />
              <ScrollArea className="h-72 border rounded-md">
                <div className="p-2 space-y-1">
                  {contacts
                    .filter(u => (u.name || u.phone || '').toLowerCase().includes(search.toLowerCase()))
                    .map(u => (
                      <button key={u.id} type="button" onClick={() => toggle(u.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted ${selected[u.id] ? 'bg-muted' : ''}`}>
                        <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">{(u.name || 'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.phone}</div>
                        </div>
                        <input type="checkbox" readOnly checked={!!selected[u.id]} className="w-4 h-4" />
                      </button>
                    ))}
                  {contacts.length === 0 && (
                    <div className="text-sm text-muted-foreground px-2 py-4">No contacts from your chats yet.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !name.trim()} className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
                {submitting ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
