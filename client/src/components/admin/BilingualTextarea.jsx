// Plain-text bilingual textarea: no rich editor, no HTML (server strips tags).
// Live x/500 counters; EN hint explains the Arabic fallback.
export default function BilingualTextarea({
  labelAr,
  labelEn,
  valueAr,
  valueEn,
  onAr,
  onEn,
  hintEn,
  max = 500,
  required = false,
  rows = 4,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="block">
        <span className="text-sm font-bold">{labelAr}</span>
        <textarea
          dir="rtl"
          rows={rows}
          required={required}
          maxLength={max}
          value={valueAr || ''}
          onChange={(e) => onAr(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-start"
        />
        <span className="text-xs text-stone-400">{(valueAr || '').length}/{max}</span>
      </label>
      <label className="block">
        <span className="text-sm font-bold">{labelEn}</span>
        <textarea
          dir="ltr"
          rows={rows}
          maxLength={max}
          value={valueEn || ''}
          onChange={(e) => onEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-start"
        />
        <span className="text-xs text-stone-400">{(valueEn || '').length}/{max}</span>
        {hintEn && <span className="block text-xs text-stone-400">{hintEn}</span>}
      </label>
    </div>
  );
}
