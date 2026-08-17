import React, { createContext, useContext, useMemo, useState } from 'react';

interface NotificationsUIContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const NotificationsUIContext = createContext<NotificationsUIContextValue | undefined>(undefined);

export function NotificationsUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      isOpen,
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
    }),
    [isOpen]
  );

  return <NotificationsUIContext.Provider value={value}>{children}</NotificationsUIContext.Provider>;
}

export function useNotificationsUI() {
  const ctx = useContext(NotificationsUIContext);
  if (!ctx) throw new Error('useNotificationsUI must be used within a NotificationsUIProvider');
  return ctx;
}
