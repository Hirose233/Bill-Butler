import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Categories from './components/Categories'
import CurrencyConverter from './components/CurrencyConverter'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'categories', label: 'Categories' },
  { key: 'currency', label: 'Currency' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-6 flex-wrap">
          <h1 className="text-2xl font-bold text-blue-700">Bill Butler</h1>
          <nav className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'transactions' && <Transactions />}
        {tab === 'categories' && <Categories />}
        {tab === 'currency' && <CurrencyConverter />}
      </main>
    </div>
  )
}
