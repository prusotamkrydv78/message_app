export const metadata = {
  title: {
    default: "Sign in | ChatX",
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

export default function AuthLayout({ children }) {
  return children;
}
