import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', type: 'expense' })
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const created = await api.createCategory(form.name, form.type)
      setCategories((prev) => [...prev, created])
      setForm({ name: '', type: 'expense' })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const expense = categories.filter((c) => c.type === 'expense')
  const income = categories.filter((c) => c.type === 'income')

  return (
    <div className="max-w-lg space-y-6">
      <div className="border rounded-xl p-5 bg-white">
        <h3 className="font-semibold mb-4">Add Category</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
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
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Category name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
              Add
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>

      <CategoryGroup title="Expense Categories" items={expense} onDelete={handleDelete} color="red" />
      <CategoryGroup title="Income Categories" items={income} onDelete={handleDelete} color="green" />
    </div>
  )
}

function CategoryGroup({ title, items, onDelete, color }) {
  const badge = color === 'red' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
  return (
    <div className="border rounded-xl p-5 bg-white">
      <h3 className="font-semibold mb-3">{title}</h3>
      {items.length === 0 && <p className="text-gray-400 text-sm">No categories yet.</p>}
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="flex justify-between items-center border rounded px-3 py-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{c.name}</span>
            <button onClick={() => onDelete(c.id)} className="text-gray-400 hover:text-red-500 text-sm">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
