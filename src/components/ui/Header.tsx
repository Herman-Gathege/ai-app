// src/components/Header.tsx
"use client";

import { useRouter } from "next/navigation";
import { UserButton } from "@stackframe/stack";
import CreditTracker from "@/components/CreditTracker";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { Pointer } from "lucide-react";

export default function Header() {
  const router = useRouter();

  return (
    <div className="flex w-full justify-between items-center p-4">
      <h1 className="text-lg font-bold flex-1 sm:w-80">
        <a href="/">adorable</a>
      </h1>
      <Image
        className="dark:invert mx-2"
        src={LogoSvg}
        alt="Adorable Logo"
        width={36}
        height={36}
      />
      <div className="flex items-center gap-2 flex-1 sm:w-80 justify-end">
        <UserButton />
        <CreditTracker />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/pricing")}
          className="text-xs"
          style={{  cursor: "Pointer" }}
        >
          Upgrade
        </Button>
      </div>
    </div>
  );
}
