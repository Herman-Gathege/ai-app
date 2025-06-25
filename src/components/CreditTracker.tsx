// src/components/CreditTracker.tsx
"use client";

import { useEffect, useState } from "react";

type CreditData = {
  plan: string;
  creditsRemaining: number;
};

export default function CreditTracker() {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [maxCredits, setMaxCredits] = useState<number>(0);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        console.log(" Fetching /api/credits...");
        const res = await fetch("/api/credits", {
          method: "GET",
          cache: "no-store", // ⬅️ critical fix
        });

        if (!res.ok) throw new Error("API error: " + res.status);
        const data = await res.json();
        console.log(" Credits fetched:", data);

        setCredits(data);

        if (data.plan === "free") setMaxCredits(5);
        else if (data.plan === "pro" || data.plan === "team") setMaxCredits(100);
      } catch (err) {
        console.error(" Failed to load credits:", err);
      }
    };

    fetchCredits();
  }, []);

  if (!credits) {
    console.log(" No credits found yet");
    return <div className="text-red-500 text-sm">sign in to see your free credits</div>;
  }

  const percentage = (credits.creditsRemaining / maxCredits) * 100;

  return (
    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border w-fit text-sm shadow">
      <div className="mb-1 font-semibold">
         Credits: {credits.creditsRemaining} / {maxCredits} ({credits.plan})
      </div>
      <div className="w-full h-2 bg-zinc-300 dark:bg-zinc-800 rounded-full">
        <div
          className="h-2 bg-green-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
