"use client";

import { useEffect, useState } from "react";
import type { TimetableSlot } from "@/lib/mock-data";

function storageKey(eventId: string): string {
  return `yse-compass:timetable:${eventId}`;
}

export function readStoredTimetable(eventId: string): TimetableSlot[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(eventId));
    return raw ? (JSON.parse(raw) as TimetableSlot[]) : null;
  } catch {
    return null;
  }
}

export function writeStoredTimetable(eventId: string, slots: TimetableSlot[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(eventId), JSON.stringify(slots));
}

export function useTimetableStore(eventId: string, initialSlots: TimetableSlot[]) {
  const [slots, setSlotsState] = useState<TimetableSlot[]>(initialSlots);

  useEffect(() => {
    const stored = readStoredTimetable(eventId);
    // Hydrating from localStorage (a client-only store the server can't see) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSlotsState(stored);
  }, [eventId]);

  function setSlots(updater: TimetableSlot[] | ((prev: TimetableSlot[]) => TimetableSlot[])) {
    setSlotsState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: TimetableSlot[]) => TimetableSlot[])(prev) : updater;
      writeStoredTimetable(eventId, next);
      return next;
    });
  }

  return [slots, setSlots] as const;
}
