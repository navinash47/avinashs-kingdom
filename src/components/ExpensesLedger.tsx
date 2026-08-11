import { useMemo, useState } from 'react'
import type { Expense, Venture } from '../types'

type Props = {
  expenses: Expense[]
  ventures: Venture[]
  subAnnualHint?: string
  onAdd: (expense: Omit<Expense, 'id'>) => void
  onRemove: (id: string) => void
}

export function ExpensesLedger({
  expenses,
  ventures,
  subAnnualHint,
  onAdd,
  onRemove,
}: Props) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD')
  const [category, setCategory] = useState('tools')
  const [ventureId, setVentureId] = useState(ventures[0]?.id ?? 'kingdom-ops')

  const usdTotal = useMemo(
    () =>
      expenses.filter((e) => e.currency === 'USD').reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

  const suggestions = useMemo(() => {
    const tips: string[] = []
    if (subAnnualHint) {
      tips.push(`Subscription kill list estimates ${subAnnualHint}. Cancel unused seats first.`)
    }
    const learning = expenses.filter((e) => e.category === 'learning')
    if (learning.length) {
      tips.push('Learning subs: pause Coursera-style seats if not used weekly.')
    }
    const tools = expenses.filter((e) => e.category === 'tools')
    if (tools.reduce((s, e) => s + e.amount, 0) > 80) {
      tips.push('Tools stack is heavy — keep Cursor, cut redundant AI chat seats.')
    }
    tips.push('Prefer INR India-client revenue to offset USD tool burn.')
    return tips
  }, [expenses, subAnnualHint])

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Expenses ledger</h2>
        <p className="muted">USD tracked ${usdTotal.toFixed(2)}</p>
      </header>

      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!label.trim() || !amount) return
          onAdd({
            date: new Date().toISOString().slice(0, 10),
            category,
            label: label.trim(),
            amount: Number(amount),
            currency,
            ventureId,
            notes: '',
          })
          setLabel('')
          setAmount('')
        }}
      >
        <div className="form-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Expense label"
          />
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
          >
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="tools">tools</option>
            <option value="api">api</option>
            <option value="learning">learning</option>
            <option value="infra">infra</option>
            <option value="other">other</option>
          </select>
          <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn primary">
            Add
          </button>
        </div>
      </form>

      <ul className="ledger">
        {expenses.map((e) => (
          <li key={e.id}>
            <span>{e.date}</span>
            <span>
              {e.label} <em className="muted">({e.category})</em>
            </span>
            <strong>
              {e.currency === 'USD' ? '$' : '₹'}
              {e.amount.toFixed(2)}
            </strong>
            <button type="button" className="btn ghost" onClick={() => onRemove(e.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <h3 className="subhead">Savings suggestions</h3>
      <ul className="tips">
        {suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  )
}
