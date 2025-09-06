"use client";
import { AuthProvider } from "../lib/auth";
import NotificationsProvider from "../components/notifications";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <NotificationsProvider />
      {children}
    </AuthProvider>
  );
}
