export const metadata = {
  title: {
    default: "Profile | ChatX",
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

export default function ProfileLayout({ children }) {
  return children;
}
