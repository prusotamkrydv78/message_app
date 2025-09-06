"use client";
import clsx from "clsx";

export default function Card({ className = "", children, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white/80 dark:bg-black/20 backdrop-blur-sm shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
