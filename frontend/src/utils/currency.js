/** Convert dollar string (e.g. "12.50") to integer cents. */
export function dollarsToCents(value) {
  return Math.round(parseFloat(value) * 100)
}

/** Convert integer cents to formatted dollar string. */
export function centsToDollars(cents) {
  return (cents / 100).toFixed(2)
}
