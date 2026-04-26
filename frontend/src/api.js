const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }
  if (res.status === 204) return null
  return res.json()
}

function buildQuery(params) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return q ? `?${q}` : ''
}

export const api = {
  // Categories
  getCategories: (type) => request('GET', `/categories/${buildQuery({ type })}`),
  createCategory: (name, type) => request('POST', '/categories/', { name, type }),
  deleteCategory: (id) => request('DELETE', `/categories/${id}`),

  // Transactions
  getTransactions: (filters = {}) => request('GET', `/transactions/${buildQuery(filters)}`),
  createTransaction: (data) => request('POST', '/transactions/', data),
  deleteTransaction: (id) => request('DELETE', `/transactions/${id}`),

  // Summary
  getSummary: (filters = {}) => request('GET', `/summary/${buildQuery(filters)}`),
  getSummaryByCategory: (filters = {}) => request('GET', `/summary/by-category${buildQuery(filters)}`),
  getSummaryByMonth: (filters = {}) => request('GET', `/summary/by-month${buildQuery(filters)}`),
  getSummaryByDay: (filters = {}) => request('GET', `/summary/by-day${buildQuery(filters)}`),

  // Exchange rates
  getExchangeRates: (base = 'CNY') => request('GET', `/exchange-rates/${buildQuery({ base })}`),
}
