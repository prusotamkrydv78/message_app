"use client";
import clsx from "clsx";

export default function Avatar({ name = "?", size = 40, className = "" }) {
  const initials = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={clsx(
        "inline-grid place-items-center rounded-full bg-gray-200 text-gray-700 font-medium select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size / 2.6)) }}
      aria-label={`Avatar of ${name}`}
    >
      {initials}
    </div>
  );
}
