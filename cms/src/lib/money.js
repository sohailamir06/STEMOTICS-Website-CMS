// Prices are edited in dollars and stored in cents.

export function centsToInput(cents) {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2);
}

// '' → null (price not set). Returns NaN for invalid input so the form can show an error.
export function inputToCents(value) {
  const text = String(value).trim().replace(/[$,]/g, '');
  if (text === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}
