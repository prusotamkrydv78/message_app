"use client";
import clsx from "clsx";

export default function Input({ label, hint, className = "", ...props }) {
  return (
    <label className={clsx("block", className)}>
      {label && <span className="block text-[13px] text-gray-700 mb-1">{label}</span>}
      <input
        className="w-full h-11 px-3 rounded-md border bg-white/90 dark:bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 placeholder:text-gray-400"
        {...props}
      />
      {hint && <span className="mt-1 block text-[12px] text-gray-500">{hint}</span>}
    </label>
  );
}
