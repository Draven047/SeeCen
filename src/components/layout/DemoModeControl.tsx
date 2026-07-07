import { useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { isDemoMode, resetDemoData } from '@/integrations/supabase/client';
import { brand } from '@/config/brand';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DemoModeControl() {
  const [confirming, setConfirming] = useState(false);

  if (!isDemoMode) return null;

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
        <p className="text-sm font-bold text-[#17191c]">Demo sandbox</p>
        <p className="mt-2 text-xs font-medium leading-5 text-[#777e87]">
          You are browsing {brand.name}&apos;s built-in demo. Data is seeded in your
          browser and saved locally, so your changes survive refreshes. Connect
          your own Supabase project to run it for real — see SELF_HOSTING.md in
          the repository.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!confirming) { setConfirming(true); return; }
            resetDemoData();
          }}
          className={
            confirming
              ? 'mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#c2352b] px-4 text-xs font-bold text-white transition-colors'
              : 'mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-[#17191c] px-4 text-xs font-bold text-white transition-colors hover:bg-[#2b2f35]'
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirming ? 'Click again to wipe and re-seed' : 'Reset demo data'}
        </button>
      </PopoverContent>
    </Popover>
  );
}
