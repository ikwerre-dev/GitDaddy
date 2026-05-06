"use client";

import { HugeiconsIcon } from "@hugeicons/react";

export function Icon({ icon, size = 20, className = "" }) {
  return <HugeiconsIcon className={className} color="currentColor" icon={icon} size={size} strokeWidth={1.7} />;
}
