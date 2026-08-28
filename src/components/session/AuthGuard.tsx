"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/context/SessionContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, hasHydrated } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentUser && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hasHydrated, currentUser, pathname, router]);

  if (!hasHydrated) {
    return null;
  }

  if (!currentUser && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
