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

// Derive site URL for canonical and Open Graph from env
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ChatX – Messaging App",
    template: "%s | ChatX",
  },
  description: "Mobile-first messaging app UI",
  keywords: [
    "chat app",
    "messaging",
    "real-time chat",
    "group chat",
    "ChatX",
  ],
  authors: [{ name: "ChatX" }],
  creator: "ChatX",
  publisher: "ChatX",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "ChatX – Messaging App",
    description: "Mobile-first messaging app UI",
    siteName: "ChatX",
    images: [
      {
        url: "/next.svg",
        width: 1200,
        height: 630,
        alt: "ChatX preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatX – Messaging App",
    description: "Mobile-first messaging app UI",
    images: ["/next.svg"],
    creator: "@chatx",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      maxVideoPreview: -1,
      maxImagePreview: "large",
      maxSnippet: -1,
    },
  },
  applicationName: "ChatX",
  category: "Communication",
  formatDetection: { telephone: false },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'ChatX',
              url: siteUrl,
              logo: new URL('/next.svg', siteUrl).toString(),
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}> 
        {/* Providers wraps the app with Auth context */}
        <Providers>
          {/* Responsive app shell: full-bleed on mobile, constrained on large screens */}
          <main className="min-h-[100dvh] flex flex-col">
            {children}
          </main>
          {/* Global notifications are rendered in Providers (app/providers.js) */}
        </Providers>
      </body>
    </html>
  );
}
