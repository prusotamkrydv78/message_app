"use client";
import { AuthProvider } from "../lib/auth";
import NotificationsProvider from "../components/notifications";
import { Toaster } from "../components/ui/toaster";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <NotificationsProvider />
      {children}
      <Toaster />
    </AuthProvider>
  );
}
