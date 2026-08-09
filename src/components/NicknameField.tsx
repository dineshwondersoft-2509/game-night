interface NicknameFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  allowEditToggle?: boolean
  autoFocus?: boolean
}

export function NicknameField({
  value,
  onChange,
  label = "What's your name?",
  allowEditToggle = false,
  autoFocus,
}: NicknameFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-ink-muted">{label}</label>
        {allowEditToggle && (
          <span className="text-xs font-semibold text-teal-dark">You can change this anytime</span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        placeholder="Nickname"
        className="w-full rounded-2xl border-2 border-surface-2 bg-surface px-4 py-3 text-lg font-semibold outline-none focus:border-teal"
        autoFocus={autoFocus}
      />
    </div>
  )
}
