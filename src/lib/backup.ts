import { toast } from 'sonner';
import i18n from '@/i18n';
import { exportDemoData } from '@/integrations/supabase/client';

/** Download the sandbox as a JSON backup file and reset the backup-nudge counter. */
export function downloadBackup(): boolean {
  const json = exportDemoData();
  if (!json) return false;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `seecen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  try { localStorage.setItem('seecen-mutations-since-backup', '0'); } catch { /* noop */ }
  toast.success(i18n.t('Backup downloaded'));
  return true;
}
