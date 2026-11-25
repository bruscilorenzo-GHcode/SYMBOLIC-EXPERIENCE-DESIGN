export function DaylightControl({
  light,
  onChange,
  label,
  night,
  day,
  variant = 'default',
}: {
  light: number
  onChange: (value: number) => void
  label: string
  night: string
  day: string
  variant?: 'default' | 'overlay'
}) {
  return (
    <label className={`daylight-control daylight-control--${variant}`}>
      <span className="daylight-control-head">
        <span>{label}</span>
        <output>{Math.round(light * 100)}%</output>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={light}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="daylight-control-scale">
        <span>{night}</span>
        <span>{day}</span>
      </span>
    </label>
  )
}
