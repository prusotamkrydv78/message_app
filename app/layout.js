import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NotificationsProvider from "../components/notifications";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ChatX – Messaging App",
  description: "Mobile-first messaging app UI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#efefef] text-foreground`}> 
        {/* Providers wraps the app with Auth context */}
        <Providers>
          {/* Clean centered container (phone-sized) */}
          <div className="h-screen w-full flex items-center justify-center ">
            <main className="w-full max-w-sm bg-white rounded-[24px] shadow-xl overflow-hidden flex flex-col h-screen">
              {children}
            </main>
          </div>
          {/* Global notifications (new messages etc.) */}
          <NotificationsProvider />
        </Providers>
      </body>
    </html>
  );
}
