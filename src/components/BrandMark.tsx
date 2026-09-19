import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';

/** Decorative beside the wordmark; named when used on its own. */
export function BrandMark({ className, labelled = false }: { className?: string; labelled?: boolean }) {
  return (
    <img
      src={brand.logo}
      alt={labelled ? `${brand.name} logo` : ''}
      aria-hidden={labelled ? undefined : true}
      width={40}
      height={40}
      draggable={false}
      className={cn('h-10 w-10 shrink-0 rounded-lg object-contain', className)}
    />
  );
}
