"use client";

import { createContext, useContext, type RefObject } from "react";

type ScrollCtx = { scrollRef: RefObject<HTMLDivElement | null>; scrollReady: boolean };

const SubscribersPageScrollRefContext = createContext<ScrollCtx | null>(null);

export function SubscribersPageScrollRefProvider({
  scrollRef,
  scrollReady,
  children,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollReady: boolean;
  children: React.ReactNode;
}) {
  return (
    <SubscribersPageScrollRefContext.Provider value={{ scrollRef, scrollReady }}>
      {children}
    </SubscribersPageScrollRefContext.Provider>
  );
}

export function useSubscribersPageScrollElement(): HTMLDivElement | null {
  const ctx = useContext(SubscribersPageScrollRefContext);
  return ctx?.scrollRef.current ?? null;
}

export function useSubscribersPageScrollReady(): boolean {
  const ctx = useContext(SubscribersPageScrollRefContext);
  return ctx?.scrollReady ?? false;
}
