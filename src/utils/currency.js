const inrNoDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrTwoDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatInr(n, { maximumFractionDigits = 0 } = {}) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return maximumFractionDigits > 0 ? inrTwoDecimals.format(v) : inrNoDecimals.format(v)
}
