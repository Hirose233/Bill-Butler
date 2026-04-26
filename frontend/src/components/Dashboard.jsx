import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api'
import { centsToDollars } from '../utils/currency'

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']
const fmt = (cents) => `¥${centsToDollars(cents)}`

// Returns { start_date, end_date } for a given "YYYY-MM" string
function monthRange(ym) {
  if (!ym) return {}
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${ym}-${String(last).padStart(2, '0')}`
  return { start_date: start, end_date: end }
}

function StatCard({ label, value, sub }) {
  return (
    <div className="border rounded-xl p-5 bg-white flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function PiePanel({ title, data, emptyMsg }) {
  if (!data.length) return (
    <div>
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <p className="text-gray-400 text-sm">{emptyMsg}</p>
    </div>
  )
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total_amount_cents"
            nameKey="category_name"
            cx="50%" cy="50%"
            outerRadius={85}
            label={({ category_name, percentage }) => `${category_name} ${percentage}%`}
          >
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function CategoryTab({ filters }) {
  const [expenseByCat, setExpenseByCat] = useState([])
  const [incomeByCat, setIncomeByCat] = useState([])

  useEffect(() => {
    if (!filters.start_date && !filters.end_date) {
      setExpenseByCat([])
      setIncomeByCat([])
      return
    }
    api.getSummaryByCategory({ ...filters, type: 'expense' }).then((d) => setExpenseByCat(d.items)).catch(console.error)
    api.getSummaryByCategory({ ...filters, type: 'income' }).then((d) => setIncomeByCat(d.items)).catch(console.error)
  }, [filters.start_date, filters.end_date])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      <PiePanel title="Expenses by Category" data={expenseByCat} emptyMsg="No expense data." />
      <PiePanel title="Income by Category" data={incomeByCat} emptyMsg="No income data." />
    </div>
  )
}

const CHART_TABS = ['Overview', 'Monthly', 'Daily']

// Default to current year-month and today
const todayStr = new Date().toISOString().slice(0, 10)
const thisMonth = todayStr.slice(0, 7)

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [expenseByCat, setExpenseByCat] = useState([])
  const [incomeByCat, setIncomeByCat] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [chartTab, setChartTab] = useState('Overview')
  const [selectedMonth, setSelectedMonth] = useState(thisMonth)
  const [selectedDay, setSelectedDay] = useState(todayStr)

  // Overview data
  useEffect(() => {
    const f = { start_date: startDate || undefined, end_date: endDate || undefined }
    api.getSummary(f).then(setSummary).catch(console.error)
    api.getSummaryByCategory({ ...f, type: 'expense' }).then((d) => setExpenseByCat(d.items)).catch(console.error)
    api.getSummaryByCategory({ ...f, type: 'income' }).then((d) => setIncomeByCat(d.items)).catch(console.error)
  }, [startDate, endDate])

  return (
    <div className="space-y-6">
      {/* Global date range filter (affects Overview + summary cards) */}
      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm text-gray-600">From</label>
        <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label className="text-sm text-gray-600">To</label>
        <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        {(startDate || endDate) && (
          <button className="text-sm text-blue-500 hover:underline" onClick={() => { setStartDate(''); setEndDate('') }}>Clear</button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Income" value={fmt(summary.total_income_cents)} />
          <StatCard label="Total Expenses" value={fmt(summary.total_expense_cents)} />
          <StatCard
            label="Net Balance"
            value={fmt(Math.abs(summary.net_balance_cents))}
            sub={summary.net_balance_cents >= 0 ? 'Surplus' : 'Deficit'}
          />
          <StatCard label="Transactions" value={summary.transaction_count} />
        </div>
      )}

      {/* Chart tabs */}
      <div className="border rounded-xl bg-white p-5 space-y-4">
        <div className="flex gap-2">
          {CHART_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setChartTab(t)}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                chartTab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview: total pie charts */}
        {chartTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PiePanel title="Expenses by Category" data={expenseByCat} emptyMsg="No expense data yet." />
            <PiePanel title="Income by Category" data={incomeByCat} emptyMsg="No income data yet." />
          </div>
        )}

        {/* Monthly: pick a month → pie charts for that month */}
        {chartTab === 'Monthly' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Month</label>
              <input
                type="month"
                className="border rounded px-2 py-1 text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <CategoryTab filters={monthRange(selectedMonth)} />
          </div>
        )}

        {/* Daily: pick a date → pie charts for that day */}
        {chartTab === 'Daily' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              />
            </div>
            <CategoryTab filters={{ start_date: selectedDay, end_date: selectedDay }} />
          </div>
        )}
      </div>
    </div>
  )
}
