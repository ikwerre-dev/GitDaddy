"use client";

export function Button({ children, variant = "default", className = "", ...props }) {
  const variants = {
    default: "border-neutral-950 bg-white text-[#1f2328] shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]",
    primary: "border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328] hover:bg-neutral-800",
    dark: "border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328] hover:bg-neutral-800",
    danger: "border-neutral-950 bg-[#ffebe9] text-[#d1242f] shadow-[2px_2px_0_#1f2328] hover:bg-[#ffd8d3]",
  };
  return (
    <button
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-black transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`h-9 rounded-md border border-neutral-950 bg-white px-3 text-sm font-semibold outline-none shadow-[2px_2px_0_#1f2328] placeholder:text-neutral-400 focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#1f2328] ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`h-9 rounded-md border border-neutral-950 bg-white px-3 text-sm font-black leading-none outline-none shadow-[2px_2px_0_#1f2328] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#1f2328] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-neutral-950 bg-white shadow-[4px_4px_0_#1f2328] ${className}`}>
      {children}
    </section>
  );
}

export function Message({ children }) {
  if (!children) return null;
  return (
    <div className="mb-4 rounded-md border border-neutral-950 bg-[#ddf4ff] px-4 py-3 text-sm font-black text-[#0969da] shadow-[2px_2px_0_#1f2328]">
      {children}
    </div>
  );
}
