"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserById, users } from "@/lib/mock";
import type { AppUser } from "@/lib/types";

const STORAGE_KEY = "yse-compass-user-id";

type SessionContextValue = {
  currentUser: AppUser | null;
  // マウント直後、localStorageの復元が完了するまではfalse。AuthGuardはこれを見てから
  // リダイレクト可否を判断し、復元前に未ログイン扱いで/loginへ飛ばす誤動作を防ぐ。
  hasHydrated: boolean;
  setCurrentUserId: (id: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // SSR時はwindowが無くlocalStorageを読めないため、初期値は常にnull(未ログイン)でサーバー/クライアントの
    // 初回描画を一致させ、マウント後にこの効果でローカルストレージの値へ反映してhydrationミスマッチを避ける。
    const storedId = window.localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      const user = getUserById(storedId);
      if (user) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser(user);
      }
    }
    setHasHydrated(true);
  }, []);

  function setCurrentUserId(id: string) {
    const user = getUserById(id);
    if (!user) return;
    setCurrentUser(user);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  function signOut() {
    setCurrentUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <SessionContext.Provider value={{ currentUser, hasHydrated, setCurrentUserId, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}

export function usePersonaList(): AppUser[] {
  return users;
}
