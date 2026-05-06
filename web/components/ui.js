"use client";

export function Button({ children, variant = "default", className = "", ...props }) {
  const variants = {
    default: "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
    primary: "border-[#1f883d] bg-[#1f883d] text-white hover:bg-[#1a7f37]",
    dark: "border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800",
    danger: "border-red-600 bg-white text-red-600 hover:bg-red-50",
  };
  return (
    <button
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={`min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#0969da] ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#0969da] ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Panel({ children, className = "" }) {
  return <section className={`rounded-md border border-neutral-300 bg-white ${className}`}>{children}</section>;
}

export function Message({ children }) {
  if (!children) return null;
  return <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{children}</p>;
}
