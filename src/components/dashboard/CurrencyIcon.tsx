import { cn } from '@/utils/cn'
import { currencySymbol } from '@/lib/currency'

/**
 * Builds a StatsCard icon that renders the hotel's own currency symbol.
 *
 * A fixed dollar glyph next to a "Rs 225,000" figure reads as a currency
 * mismatch, so revenue tiles show the symbol that matches the amount.
 */
export function currencyIcon(currency: string) {
  const symbol = currencySymbol(currency).trim()

  function CurrencyIcon({ className }: { className?: string }) {
    return (
      <span
        className={cn('inline-flex items-center justify-center font-extrabold leading-none', className)}
        // Multi-character symbols (AED, SAR) need to shrink to stay inside the badge.
        style={{ fontSize: symbol.length > 2 ? 10 : symbol.length > 1 ? 12 : 15 }}
        aria-hidden
      >
        {symbol}
      </span>
    )
  }

  return CurrencyIcon
}
