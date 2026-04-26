import { useState } from 'react'
import { api } from '../api'

const COMMON_CURRENCIES = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'SGD', 'KRW', 'AUD', 'CAD']

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('CNY')
  const [result, setResult] = useState(null)
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConvert = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api.getExchangeRates(from)
      setRates(data.rates)
      const rate = data.rates[to]
      if (!rate) throw new Error(`Unsupported currency: ${to}`)
      const converted = parseFloat(amount) * rate
      setResult({ from, to, rate, original: parseFloat(amount), converted })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-semibold">Currency Converter</h2>

      <form onSubmit={handleConvert} className="space-y-4 border rounded-xl p-5 bg-white">
        <div className="flex gap-3">
          <input
            className="border rounded px-3 py-2 flex-1"
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select className="border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)}>
            {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-lg">→</span>
          <select className="border rounded px-3 py-2 flex-1" value={to} onChange={(e) => setTo(e.target.value)}>
            {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Convert'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
          <p className="text-2xl font-bold text-blue-700">
            {result.converted.toFixed(4)} {result.to}
          </p>
          <p className="text-sm text-gray-600">
            {result.original} {result.from} × rate {result.rate}
          </p>
        </div>
      )}

      {rates && (
        <div className="border rounded-xl p-5 bg-white">
          <h3 className="font-medium mb-3 text-sm text-gray-600">Live rates (base: {from})</h3>
          <div className="grid grid-cols-3 gap-2">
            {COMMON_CURRENCIES.filter((c) => c !== from).map((c) => (
              <div key={c} className="border rounded px-3 py-2 text-sm">
                <span className="text-gray-500">{c}</span>
                <span className="ml-2 font-medium">{rates[c]?.toFixed(4) ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
