"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Save, X, Phone, User, Mail, Camera } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, accessToken, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phoneNumber: "",
    countryCode: "+1"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        phoneNumber: user.phoneNumber || "",
        countryCode: user.countryCode || "+1"
      });
    }
  }, [user]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Here you would call an API to update user profile
      // For now, we'll just update the local state
      setUser({ ...user, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: user?.name || "",
      phoneNumber: user?.phoneNumber || "",
      countryCode: user?.countryCode || "+1"
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-b border-border/20 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-10 w-10 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.header>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-6">
            {/* Profile Picture Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center py-8"
            >
              <div className="relative">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <h2 className="text-2xl font-bold text-center">{user.name}</h2>
              <p className="text-muted-foreground text-center">
                {user.countryCode} {user.phoneNumber}
              </p>
            </motion.div>

            {/* Profile Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="pl-10"
                          placeholder="Enter your full name"
                        />
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">{user.name || "Not set"}</p>
                    )}
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <select
                          value={editForm.countryCode}
                          onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value })}
                          className="px-3 py-2 border border-input bg-background rounded-md text-sm w-20"
                        >
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+91">+91</option>
                          <option value="+86">+86</option>
                          <option value="+33">+33</option>
                          <option value="+49">+49</option>
                          <option value="+81">+81</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            value={editForm.phoneNumber}
                            onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                            className="pl-10"
                            placeholder="Enter phone number"
                            type="tel"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {user.countryCode} {user.phoneNumber}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={logout}
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
              className="h-12 w-12 rounded-full p-0 text-muted-foreground hover:text-primary"
              onClick={() => router.push('/chat')}
            >
              <Mail className="w-6 h-6" />
            </Button>
            
            <Button
              size="sm"
              className="bg-black hover:bg-black/90 text-white rounded-full px-6 py-2 h-10"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 rounded-full p-0 text-primary"
            >
              <User className="w-6 h-6" />
            </Button>
          </div>
        </motion.nav>
      </div>
    </div>
  );
}
