export const CURRENCIES = [
  { code: 'PKR', label: 'PKR — Pakistani Rupee',    symbol: 'Rs ' },
  { code: 'USD', label: 'USD — US Dollar',           symbol: '$'   },
  { code: 'EUR', label: 'EUR — Euro',                symbol: '€'   },
  { code: 'GBP', label: 'GBP — British Pound',       symbol: '£'   },
  { code: 'AED', label: 'AED — UAE Dirham',          symbol: 'AED' },
  { code: 'SAR', label: 'SAR — Saudi Riyal',         symbol: 'SAR' },
  { code: 'INR', label: 'INR — Indian Rupee',        symbol: '₹'   },
  { code: 'QAR', label: 'QAR — Qatari Riyal',       symbol: 'QR'  },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar',      symbol: 'KD'  },
  { code: 'BDT', label: 'BDT — Bangladeshi Taka',   symbol: '৳'   },
  { code: 'CAD', label: 'CAD — Canadian Dollar',    symbol: 'C$'  },
  { code: 'AUD', label: 'AUD — Australian Dollar',  symbol: 'A$'  },
  { code: 'TRY', label: 'TRY — Turkish Lira',       symbol: '₺'   },
  { code: 'EGP', label: 'EGP — Egyptian Pound',     symbol: 'E£'  },
]

export function currencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const sym = currencySymbol(currency)
  return `${sym}${Math.round(amount).toLocaleString()}`
}

export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  const sym = currencySymbol(currency)
  if (amount === 0) return `${sym}0`
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`
  return `${sym}${Math.round(amount).toLocaleString()}`
}
