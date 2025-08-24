// components/AdSlot.tsx
"use client";
import { useEffect } from "react";

export default function AdSlot({
  slot = "home-top",
  placeholder = "Your ad here (responsive)",
}: {
  slot?: string;
  placeholder?: string;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // e.g., "ca-pub-XXXX"
  useEffect(() => {
    if (!client) return;
    // @ts-ignore
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, [client]);

  if (!client) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed bg-slate-50 text-slate-500">
        {placeholder}
      </div>
    );
  }

  return (
    <>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" />
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
