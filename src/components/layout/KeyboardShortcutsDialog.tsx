import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const shortcuts = [
  { keys: ['⌘', 'K'], alt: ['Ctrl', 'K'], action: 'Search orders, customers, products, and pages' },
  { keys: ['Shift', 'N'], action: 'Start a new order' },
  { keys: ['?'], action: 'Show this shortcuts help' },
  { keys: ['Esc'], action: 'Close dialogs and popups' },
];

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-black/10 bg-[#f4f5f2] px-2 font-sans text-xs font-bold text-[#30343a]"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Keyboard className="h-4 w-4 text-[#563ed5]" />
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.action} className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[#4a515b]">{shortcut.action}</p>
              <div className="flex items-center gap-2">
                <Keys keys={shortcut.keys} />
                {shortcut.alt && (
                  <>
                    <span className="text-xs text-[#9aa0a8]">or</span>
                    <Keys keys={shortcut.alt} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
