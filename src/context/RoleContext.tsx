"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "@/lib/types";

const STORAGE_KEY = "yse-compass-role";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("teacher");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "teacher" || stored === "presenter" || stored === "viewer") {
      // SSR時はwindowがなくlocalStorageを読めないため、初期値は常に"teacher"でサーバー/クライアントの
      // 初回描画を一致させ、マウント後にこの効果でローカルストレージの値へ反映してhydrationミスマッチを避ける。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleState(stored);
    }
  }, []);

  function setRole(next: Role) {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return ctx;
}
