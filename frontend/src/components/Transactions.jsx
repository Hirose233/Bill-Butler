import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { dollarsToCents, centsToDollars } from '../utils/currency'

const CURRENCIES = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'SGD', 'KRW', 'AUD', 'CAD']

const EMPTY_FORM = { description: '', amount: '', date: '', categoryId: '', type: 'expense', currency: 'CNY' }

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState({ start_date: '', end_date: '', category_id: '', type: '' })
  const [rateInfo, setRateInfo] = useState(null)   // { rate, cnyAmount }
  const [rateLoading, setRateLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error)
  }, [])

  const fetchTransactions = useCallback(() => {
    api.getTransactions(filters).then(setTransactions).catch(console.error)
  }, [filters])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Fetch live exchange rate whenever currency or amount changes
  useEffect(() => {
    if (form.currency === 'CNY' || !form.amount || parseFloat(form.amount) <= 0) {
      setRateInfo(null)
      return
    }
    let cancelled = false
    setRateLoading(true)
    setRateInfo(null)
    api.getExchangeRates(form.currency)
      .then((data) => {
        if (cancelled) return
        const rate = data.rates?.CNY
        if (rate) {
          setRateInfo({ rate, cnyAmount: parseFloat(form.amount) * rate })
        } else {
          setRateInfo({ error: 'CNY rate not found in response' })
        }
      })
      .catch((err) => {
        if (!cancelled) setRateInfo({ error: err.message })
      })
      .finally(() => { if (!cancelled) setRateLoading(false) })
    return () => { cancelled = true }
  }, [form.currency, form.amount])

  const formCategories = categories.filter((c) => c.type === form.type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const originalAmountCents = dollarsToCents(form.amount)
    let amountCents = originalAmountCents

    if (form.currency !== 'CNY') {
      if (!rateInfo) {
        setError('Exchange rate not loaded yet. Please wait a moment.')
        return
      }
      amountCents = Math.round(rateInfo.cnyAmount * 100)
    }

    try {
      await api.createTransaction({
        description: form.description || null,
        amount_cents: amountCents,
        date: form.date,
        category_id: parseInt(form.categoryId),
        type: form.type,
        original_currency: form.currency !== 'CNY' ? form.currency : null,
        original_amount_cents: form.currency !== 'CNY' ? originalAmountCents : null,
        exchange_rate: form.currency !== 'CNY' && rateInfo ? String(rateInfo.rate) : null,
      })
      fetchTransactions()
      setForm(EMPTY_FORM)
      setRateInfo(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    await api.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const clearFilters = () => setFilters({ start_date: '', end_date: '', category_id: '', type: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="border rounded-xl p-5 bg-white">
        <h3 className="font-semibold mb-4">Add Transaction</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          {/* Income / Expense toggle */}
          <div className="col-span-2 flex gap-2">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                className={`flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.type === t
                    ? t === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500'
                    : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          {/* Amount + currency */}
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1 min-w-0"
              type="number"
              step="0.01"
              placeholder="Amount *"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <select
              className="border rounded px-2 py-2"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date */}
          <input
            className="border rounded px-3 py-2"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          {/* Category */}
          <select
            className="border rounded px-3 py-2"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Category *</option>
            {formCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Note */}
          <input
            className="border rounded px-3 py-2"
            placeholder="Note (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* CNY conversion preview */}
          {form.currency !== 'CNY' && form.amount && (
            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
              {rateLoading && <span className="text-gray-400">Fetching rate…</span>}
              {!rateLoading && rateInfo && !rateInfo.error && (
                <span className="text-blue-700">
                  ≈ <strong>¥{rateInfo.cnyAmount.toFixed(2)}</strong> CNY
                  <span className="text-gray-400 ml-2">(1 {form.currency} = {rateInfo.rate.toFixed(6)} CNY)</span>
                </span>
              )}
              {!rateLoading && rateInfo?.error && (
                <span className="text-red-500">Rate unavailable: {rateInfo.error}</span>
              )}
              {!rateLoading && !rateInfo && (
                <span className="text-red-500">Could not load exchange rate.</span>
              )}
            </div>
          )}

          <button type="submit" className="col-span-2 bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
            Add
          </button>
          {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Type</label>
          <select className="border rounded px-2 py-1 text-sm" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Category</label>
          <select className="border rounded px-2 py-1 text-sm" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-blue-500 hover:underline pb-1">Clear</button>
        )}
      </div>

      {/* Table */}
      <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border">Date</th>
            <th className="text-left p-2 border">Category</th>
            <th className="text-left p-2 border">Type</th>
            <th className="text-left p-2 border">Note</th>
            <th className="text-right p-2 border">Amount (CNY)</th>
            <th className="p-2 border"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-gray-400">No transactions found.</td></tr>
          )}
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="p-2 border">{t.date}</td>
              <td className="p-2 border">{t.category.name}</td>
              <td className="p-2 border">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {t.type === 'income' ? 'Income' : 'Expense'}
                </span>
              </td>
              <td className="p-2 border text-gray-500">{t.description ?? '—'}</td>
              <td className={`p-2 border text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                <div>{t.type === 'income' ? '+' : '-'}¥{centsToDollars(t.amount_cents)}</div>
                {t.original_currency && (
                  <div className="text-xs text-gray-400 font-normal">
                    {t.original_currency} {centsToDollars(t.original_amount_cents)}
                  </div>
                )}
              </td>
              <td className="p-2 border text-center">
                <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
