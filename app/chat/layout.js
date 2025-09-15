export const metadata = {
  title: {
    default: "Chat | ChatX",
    template: "%s | ChatX",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ChatLayout({ children }) {
  return children;
}
