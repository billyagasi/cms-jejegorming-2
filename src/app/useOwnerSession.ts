import { useEffect } from 'react';
import { useOwnerStore, startOwnerActivityWatch } from './store';
import { useAppConfig } from '../data-layer/hooks';
import { pushToast } from '../components/ui/toastStore';

/** Sesi owner untuk akses keuangan — username+kode vs config, timeout inaktivitas 10 menit. */
export function useOwnerSession() {
  const isOwnerAuthenticated = useOwnerStore((s) => s.isOwnerAuthenticated);
  const setOwnerAuthenticated = useOwnerStore((s) => s.setOwnerAuthenticated);
  const { data: config } = useAppConfig();

  // Watchdog inaktivitas
  useEffect(() => {
    if (!isOwnerAuthenticated) return;
    const cleanup = startOwnerActivityWatch(() => {
      setOwnerAuthenticated(false);
      pushToast({
        tone: 'error',
        title: 'Sesi Owner Berakhir',
        message: 'Timeout inaktivitas 10 menit demi keamanan data keuangan. Silakan login kembali.',
      });
    });
    return cleanup;
  }, [isOwnerAuthenticated, setOwnerAuthenticated]);

  const loginOwner = (username: string, accessCode: string): boolean => {
    if (config && username === config.ownerUsername && accessCode === config.ownerAccessCode) {
      setOwnerAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutOwner = () => setOwnerAuthenticated(false);

  return { isOwnerAuthenticated, loginOwner, logoutOwner };
}