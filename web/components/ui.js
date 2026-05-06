"use client";

export function Button({ children, variant = "default", className = "", ...props }) {
  const variants = {
    default: "border-[#d0d7de] bg-[#f6f8fa] text-[#24292f] hover:bg-[#f3f4f6]",
    primary: "border-[#1f883d] bg-[#1f883d] text-white hover:bg-[#1a7f37]",
    dark: "border-[#24292f] bg-[#24292f] text-white hover:bg-[#1f2328]",
    danger: "border-[#d1242f] bg-white text-[#d1242f] hover:bg-[#d1242f] hover:text-white",
  };
  return (
    <button
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`h-9 rounded-md border border-[#d0d7de] bg-white px-3 text-sm outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`h-9 rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium leading-none outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-md border border-[#d0d7de] bg-white ${className}`}>
      {children}
    </section>
  );
}

export function Message({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 rounded-md border border-[#0969da] bg-[#ddf4ff] px-4 py-3 text-sm text-[#0969da]">
      {children}
    </div>
  );
}
