"use client";
import clsx from "clsx";

export default function Button({ as: As = "button", className = "", variant = "primary", size = "md", children, ...props }) {
  const base = "inline-flex items-center justify-center font-medium transition-colors rounded-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20";
  const sizes = {
    sm: "h-9 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-11 px-5 text-[15px]",
  };
  const variants = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary: "bg-white text-black border hover:bg-gray-50",
    ghost: "bg-transparent hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-600/90",
  };
  const cn = clsx(base, sizes[size], variants[variant], className);
  return <As className={cn} {...props}>{children}</As>;
}
