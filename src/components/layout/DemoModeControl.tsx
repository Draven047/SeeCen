import { useRef, useState } from 'react';
import { Download, FlaskConical, MonitorDown, RotateCcw, ShoppingBag, Store, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_OPTIONS, setLanguage } from '@/i18n';
import { importDemoData, isDemoMode, resetDemoData, SETUP_MARKER_KEY } from '@/integrations/supabase/client';
import { downloadBackup } from '@/lib/backup';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { brand } from '@/config/brand';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DemoModeControl() {
  const { t, i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canInstall, install, isStandalone } = usePwaInstall();

  if (!isDemoMode) return null;

  const reopenWizard = () => {
    try { localStorage.removeItem(SETUP_MARKER_KEY); } catch { /* noop */ }
    window.location.reload();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = importDemoData(text);
    if (result.ok) {
      toast.success('Backup restored — reloading');
      setTimeout(() => window.location.reload(), 600);
    } else {
      toast.error(result.error || 'Import failed');
    }
  };

  return (
    <Popover onOpenChange={() => setConfirming(false)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About demo mode"
          className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-[#563ed5] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)] transition-transform hover:scale-[1.02]"
        >
          <FlaskConical className="h-4 w-4" />
          Demo
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-3xl border-black/[0.06] bg-white p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-bold text-[#17191c]">{t('Demo sandbox')}</p>
        <p className="mt-2 text-xs font-medium leading-5 text-[#777e87]">
          You are browsing {brand.name}&apos;s built-in demo. Data is seeded in your
          browser and saved locally, so your changes survive refreshes. Connect
          your own Supabase project to run it for real — see SELF_HOSTING.md in
          the repository.
        </p>

        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9aa0a8]">{t('Language')}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={
                  i18n.language === lang.code
                    ? 'min-h-[32px] rounded-full bg-[#563ed5] px-2 text-[11px] font-bold text-white'
                    : 'min-h-[32px] rounded-full bg-[#f4f5f2] px-2 text-[11px] font-bold text-[#5e656f] hover:text-[#17191c]'
                }
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {canInstall && !isStandalone && (
          <button
            type="button"
            onClick={() => install()}
            className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full border border-[#563ed5]/30 bg-[#563ed5]/5 px-4 text-xs font-bold text-[#563ed5] transition-colors hover:bg-[#563ed5]/10"
          >
            <MonitorDown className="h-3.5 w-3.5" />
            {t('Install SeeCen as an app')}
          </button>
        )}

        <button
          type="button"
          onClick={reopenWizard}
          className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#f4f5f2] px-4 text-xs font-bold text-[#30343a] transition-colors hover:text-[#17191c]"
        >
          <Store className="h-3.5 w-3.5" />
          {t('Set up my own store')}
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('seecen-simulate-order'))}
          className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#563ed5] px-4 text-xs font-bold text-white transition-colors hover:bg-[#4a35b8]"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {t('Simulate incoming order')}
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => downloadBackup()}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-[#f4f5f2] px-3 text-xs font-bold text-[#30343a] transition-colors hover:text-[#17191c]"
          >
            <Download className="h-3.5 w-3.5" />
            {t('Export backup')}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-[#f4f5f2] px-3 text-xs font-bold text-[#30343a] transition-colors hover:text-[#17191c]"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('Import backup')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              handleImportFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            if (!confirming) { setConfirming(true); return; }
            resetDemoData();
          }}
          className={
            confirming
              ? 'mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#c2352b] px-4 text-xs font-bold text-white transition-colors'
              : 'mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#17191c] px-4 text-xs font-bold text-white transition-colors hover:bg-[#2b2f35]'
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirming ? t('Click again to wipe and re-seed') : t('Reset demo data')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
