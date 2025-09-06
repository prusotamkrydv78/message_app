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
        <Providers>
          {/* App Shell */}
          <div className="min-h-dvh w-full">
            <header className="sticky top-0 z-20 border-b backdrop-blur bg-background/80">
              <nav className="mx-auto max-w-[900px] px-4 h-12 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-6 rounded-md bg-black" />
                  <span className="font-semibold tracking-tight text-[15px]">ChatX</span>
                </div>
                <div className="text-[12px] text-gray-500">Modern • Fast • Secure</div>
              </nav>
            </header>
            <main className="mx-auto max-w-[900px] px-4 flex flex-col min-h-[calc(100dvh-3rem)]">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
