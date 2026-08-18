import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useBusy() {
  const { busy, setBusy } = useContext(AppContext);
  return { busy, setBusy };
}
