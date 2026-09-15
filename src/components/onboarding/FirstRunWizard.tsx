import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, Languages, Rocket, Sparkles, Store } from 'lucide-react';
import { isDemoMode, setupMyStore, SETUP_MARKER_KEY } from '@/integrations/supabase/client';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n';
import { brand } from '@/config/brand';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

function markerExists(): boolean {
  try { return localStorage.getItem(SETUP_MARKER_KEY) != null; } catch { return true; }
}

function writeMarker(mode: 'sample' | 'my-store', lang: string) {
  try {
    localStorage.setItem(SETUP_MARKER_KEY, JSON.stringify({ mode, lang, completedAt: new Date().toISOString() }));
    localStorage.setItem('seecen-lang', lang);
  } catch { /* storage unavailable */ }
}

export function FirstRunWizard() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(markerExists);
  const [step, setStep] = useState<'language' | 'mode' | 'store' | 'done'>('language');
  const [lang, setLang] = useState('en');
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('');
  const [chosenMode, setChosenMode] = useState<'sample' | 'my-store'>('sample');
  const { canInstall, install, isIos, isStandalone } = usePwaInstall();

  if (!isDemoMode || dismissed) return null;

  const finishSample = () => {
    setChosenMode('sample');
    writeMarker('sample', lang);
    setStep('done');
  };

  const finishMyStore = () => {
    setChosenMode('my-store');
    writeMarker('my-store', lang);
    setupMyStore(storeName, city);
    setStep('done');
  };

  const close = () => {
    setDismissed(true);
    if (chosenMode === 'my-store') window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#080a0e]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] sm:p-8">
        {/* Brand mark */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#563ed5] text-white shadow-[0_0_26px_rgba(86,62,213,0.35)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-bold text-[#17191c]">{brand.name}</p>
            <p className="text-xs font-medium text-[#8b9098]">{t('Your store, on your computer')}</p>
          </div>
        </div>

        {step === 'language' && (
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#17191c]">
              <Languages className="h-4 w-4 text-[#563ed5]" />
              Choose your language / अपनी भाषा चुनें
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLang(l.code); setLanguage(l.code); }}
                  className={cn(
                    'min-h-[48px] rounded-2xl border px-4 text-sm font-bold transition-colors',
                    lang === l.code
                      ? 'border-[#563ed5] bg-[#563ed5]/10 text-[#563ed5]'
                      : 'border-black/10 text-[#30343a] hover:bg-[#f4f5f2]',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] font-medium leading-4 text-[#9aa0a8]">
              Interface translations are rolling out — your choice is saved and applies as they land.
            </p>
            <button
              type="button"
              onClick={() => setStep('mode')}
              className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#17191c] text-sm font-bold text-white transition-colors hover:bg-[#2b2f35]"
            >
              {t('Continue')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'mode' && (
          <div>
            <p className="text-sm font-bold text-[#17191c]">{t('How do you want to start?')}</p>
            <button
              type="button"
              onClick={() => setStep('store')}
              className="mt-4 flex w-full items-start gap-3 rounded-2xl border-2 border-[#563ed5] bg-[#563ed5]/5 p-4 text-left transition-transform hover:scale-[1.01]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#563ed5] text-white">
                <Store className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#17191c]">{t('Set up my store')}</span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-[#777e87]">
                  {t('Start fresh with your own store name. Add your products and orders — everything stays on this computer.')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={finishSample}
              className="mt-2 flex w-full items-start gap-3 rounded-2xl border border-black/10 p-4 text-left transition-colors hover:bg-[#f4f5f2]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f5f2] text-[#563ed5]">
                <Rocket className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#17191c]">{t('Explore with sample data')}</span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-[#777e87]">
                  {t('Look around a busy example store first. You can switch to your own store anytime from the Demo menu.')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep('language')}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#8b9098] hover:text-[#17191c]"
            >
              <ArrowLeft className="h-3 w-3" /> {t('Back')}
            </button>
          </div>
        )}

        {step === 'store' && (
          <div>
            <p className="text-sm font-bold text-[#17191c]">{t('Tell us about your store')}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#5e656f]">{t('Store name')}</label>
                <Input
                  autoFocus
                  placeholder="e.g. Sharma Fashion House"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1 min-h-[48px] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#5e656f]">{t('City')}</label>
                <Input
                  placeholder="e.g. Jaipur"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 min-h-[48px] rounded-xl"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={storeName.trim().length < 2}
              onClick={finishMyStore}
              className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#563ed5] text-sm font-bold text-white transition-colors hover:bg-[#4a35b8] disabled:opacity-40"
            >
              {t('Create my store')} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setStep('mode')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#8b9098] hover:text-[#17191c]"
            >
              <ArrowLeft className="h-3 w-3" /> {t('Back')}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#22a06b]/10 text-[#22a06b]">
              <Check className="h-7 w-7" />
            </span>
            <p className="mt-4 text-lg font-bold text-[#17191c]">
              {chosenMode === 'my-store' ? `${storeName.trim()} ✓` : t("You're all set!")}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-[#777e87]">
              {chosenMode === 'my-store'
                ? 'Add your first product from Catalogue, then create your first order. Your data stays on this computer — take backups from the Demo menu.'
                : 'Explore freely — nothing you do here affects anyone. Reset anytime from the Demo menu.'}
            </p>
            {canInstall && !isStandalone && (
              <button
                type="button"
                onClick={() => install()}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#563ed5]/30 bg-[#563ed5]/5 text-sm font-bold text-[#563ed5] transition-colors hover:bg-[#563ed5]/10"
              >
                <Download className="h-4 w-4" /> {t('Install SeeCen as an app')}
              </button>
            )}
            {isIos && !isStandalone && (
              <p className="mt-3 text-[11px] font-medium text-[#9aa0a8]">
                On iPhone/iPad: tap Share, then “Add to Home Screen” to install.
              </p>
            )}
            <button
              type="button"
              onClick={close}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#17191c] text-sm font-bold text-white transition-colors hover:bg-[#2b2f35]"
            >
              {t('Open my dashboard')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
