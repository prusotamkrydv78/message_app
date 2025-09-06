import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}> 
        {/* Providers wraps the app with Auth context */}
        <div className="min-h-dvh w-full max-w-[680px] mx-auto flex flex-col">
          {/** Provider is a Client Component */}
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          {/* Providers is imported as a Client Component below */}
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
