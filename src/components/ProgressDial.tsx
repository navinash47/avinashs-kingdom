type Props = {
  value: number
  size?: number
  label?: string
}

export function ProgressDial({ value, size = 88, label }: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c
  return (
    <div className="dial" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" width={size} height={size} aria-hidden>
        <circle className="dial-track" cx="44" cy="44" r={r} />
        <circle
          className="dial-value"
          cx="44"
          cy="44"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className="dial-label">
        <strong>{clamped}%</strong>
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  )
}
