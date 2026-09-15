import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { downloadBackup } from '@/lib/backup';
import { isDemoMode } from '@/integrations/supabase/client';

const GUIDES: { key: string; title: string; steps: string[] }[] = [
  {
    key: 'create-order',
    title: 'How do I create an order?',
    steps: [
      'Tap the “New order” button on the dashboard, or the round Order button at the bottom.',
      'Pick the products, choose the customer, and confirm payment.',
      'The order appears in Orders under “New” — accept it to start packing.',
    ],
  },
  {
    key: 'pack-ship',
    title: 'How do I pack and ship an order?',
    steps: [
      'Open Orders and accept the new order.',
      'Move it forward with one tap: Start Picking → Mark Packed → Ready for Pickup.',
      'Print the pack slip from the order panel and tape it on the parcel.',
      'Hand the parcel to your courier and mark it In Transit.',
    ],
  },
  {
    key: 'failed-delivery',
    title: 'A delivery failed. What now?',
    steps: [
      'Open NDR from the menu — every failed delivery is listed there.',
      'First tap “Ask customer” to confirm on WhatsApp — most failures are bad timing, not refusals.',
      'Then tap Reattempt to send it again, or RTO to bring it back.',
    ],
  },
  {
    key: 'add-product',
    title: 'How do I add a product?',
    steps: [
      'Open Catalogue and tap “Add Product”.',
      'Fill the name, price, and photo. Save it.',
      'Open Inventory and set how many pieces you have in stock.',
    ],
  },
  {
    key: 'backup',
    title: 'How do I keep my data safe?',
    steps: [
      'Your data lives only on this computer — nothing is uploaded anywhere.',
      'Tap the Demo button at the top, then “Export backup” to download a backup file.',
      'Keep the file safe (email it to yourself or copy to a pen drive).',
      'On a new computer, use “Import backup” to bring everything back.',
    ],
  },
  {
    key: 'profit',
    title: 'Where do I see my profit?',
    steps: [
      'Open Finance and switch to the Profit tab.',
      'It shows your real profit: sales minus product cost, fees, shipping, and expenses.',
      'Add your rent, ads, and other costs with “Add expense” so the number stays honest.',
    ],
  },
];

export function HelpSheet() {
  const { t } = useTranslation();

  // Backup nudge: when the sandbox has many unsaved-to-file changes, offer a one-tap backup.
  useEffect(() => {
    if (!isDemoMode) return;
    const handler = () => {
      toast(t('Your data lives on this computer'), {
        description: t('You have made many changes since your last backup. Download one now?'),
        duration: 12000,
        action: { label: t('Back up now'), onClick: () => downloadBackup() },
      });
    };
    window.addEventListener('seecen-backup-nudge', handler);
    return () => window.removeEventListener('seecen-backup-nudge', handler);
  }, [t]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t('Help')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17191c] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.65)] transition-transform hover:scale-[1.03]"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('How do I…?')}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {t('Short guides for everyday store work.')}
        </p>
        <Accordion type="single" collapsible className="mt-4">
          {GUIDES.map((guide) => (
            <AccordionItem key={guide.key} value={guide.key}>
              <AccordionTrigger className="text-left text-sm font-bold">
                {t(guide.title)}
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 pl-1">
                  {guide.steps.map((step, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {index + 1}
                      </span>
                      {t(step)}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}
