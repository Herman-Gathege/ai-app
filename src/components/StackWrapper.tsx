// src/components/StackWrapper.tsx
'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/auth/stack-client";

export default function StackWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  );
}
