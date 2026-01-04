"use client";

import type { ReactNode } from "react";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SessionProvider>
  );
}
