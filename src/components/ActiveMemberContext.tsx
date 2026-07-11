"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Member } from "@/lib/members";

const STORAGE_KEY = "huishoud:actief-lid";

let cached: string | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized() {
  if (!initialized && typeof window !== "undefined") {
    cached = window.localStorage.getItem(STORAGE_KEY);
    initialized = true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  ensureInitialized();
  return cached;
}

function getServerSnapshot() {
  return null;
}

function setStoredActiveMemberId(id: string) {
  cached = id;
  initialized = true;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  listeners.forEach((l) => l());
}

type Ctx = {
  members: Member[];
  activeMemberId: string | null;
  setActiveMemberId: (id: string) => void;
};

const ActiveMemberContext = createContext<Ctx | null>(null);

export function ActiveMemberProvider({
  members,
  children,
}: {
  members: Member[];
  children: React.ReactNode;
}) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const activeMemberId =
    stored && members.some((m) => m.id === stored) ? stored : (members[0]?.id ?? null);

  const value = useMemo<Ctx>(
    () => ({ members, activeMemberId, setActiveMemberId: setStoredActiveMemberId }),
    [members, activeMemberId],
  );

  return (
    <ActiveMemberContext.Provider value={value}>
      {children}
    </ActiveMemberContext.Provider>
  );
}

export function useActiveMember() {
  const ctx = useContext(ActiveMemberContext);
  if (!ctx) throw new Error("useActiveMember must be used within ActiveMemberProvider");
  return ctx;
}
