import { createContext, useMemo, useState } from 'react';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [busy, setBusy] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState(null);

  const value = useMemo(() => ({ busy, setBusy, selectedClosure, setSelectedClosure }), [busy, selectedClosure]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
