export default function manifest() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    name: "ChatX",
    short_name: "ChatX",
    description: "Mobile-first messaging app UI",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/next.svg",
        type: "image/svg+xml",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
