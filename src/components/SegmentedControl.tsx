type Props = {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}

export function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <div className="seg" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={value === opt.id ? 'seg-btn active' : 'seg-btn'}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
