/**
 * Notification composable for showing toast messages
 */

import { useQuasar } from 'quasar';

export function useNotification() {
  const $q = useQuasar();

  const showSuccNotif = (message: string) => {
    $q.notify({
      message,
      color: 'positive',
      icon: 'done',
      timeout: 500,
    });
  };

  const showWarnNotif = (message: string) => {
    $q.notify({
      message,
      color: 'warning',
      icon: 'warning',
    });
  };

  const showErrNotif = (message: string) => {
    $q.notify({
      message,
      color: 'negative',
      icon: 'bug_report',
    });
  };

  return {
    showSuccNotif,
    showWarnNotif,
    showErrNotif,
  };
}
