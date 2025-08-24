// components/AdSlot.tsx
import React from "react";

type Props = {
  className?: string;
  label?: string;
};

export default function AdSlot({
  className = "",
  label = "Advertisement",
}: Props) {
  // Simple placeholder box — replace with your ad network init when ready
  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center ${className}`}
    >
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm text-zinc-300">Your ad could be here</div>
    </div>
  );
}
