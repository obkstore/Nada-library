// Side-by-side single-line bilingual input: Arabic required (rtl), English optional (ltr).
// Stacked on mobile via grid-cols-1, side-by-side on md+.
export default function BilingualField({
  labelAr,
  labelEn,
  valueAr,
  valueEn,
  onAr,
  onEn,
  hintEn,
  max = 200,
  required = false,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="block">
        <span className="text-sm font-bold">{labelAr}</span>
        <input
          dir="rtl"
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
        <input
          dir="ltr"
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
