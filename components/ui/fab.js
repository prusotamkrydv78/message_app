"use client";
import clsx from "clsx";

export default function FAB({ icon = null, className = "", ...props }) {
  return (
    <button
      className={clsx(
        "fixed md:absolute bottom-6 right-6 inline-flex items-center justify-center rounded-full bg-black text-white size-14 shadow-xl active:scale-95 transition-transform",
        className
      )}
      {...props}
    >
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M12 5a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h5V6a1 1 0 011-1z" />
        </svg>
      )}
    </button>
  );
}
