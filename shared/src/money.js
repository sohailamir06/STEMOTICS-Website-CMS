// Money is stored as integer cents everywhere (12999 = $129.99).

const cadFormatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export function formatCents(cents) {
  return cadFormatter.format(cents / 100);
}

export function dollarsToCents(dollars) {
  return Math.round(Number(dollars) * 100);
}
