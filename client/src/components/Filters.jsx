import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AGE_CHIPS = [
  { key: 'age36', min: '3', max: '5' },
  { key: 'age69', min: '6', max: '9' },
  { key: 'age912', min: '9', max: '12' },
];

// Shared filter controls. `immediate` (desktop sidebar) applies on every change;
// draft mode (mobile sheet) buffers edits until the sticky apply button.
export function FilterBody({ vals, setVals, onApply, immediate, categories, fixedCategory, hasAge, pickName }) {
  const { t } = useTranslation();
  const set = (patch) => (immediate ? onApply(patch) : setVals(patch));

  return (
    <div className="space-y-5">
      {!fixedCategory && (
        <fieldset>
          <legend className="font-bold text-sm mb-2">{t('public.fCategory')}</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set({ category: '' })}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-bold ${!vals.category ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-300'}`}
            >
              {t('public.allCategories')}
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => set({ category: c.slug })}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-bold ${vals.category === c.slug ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-300'}`}
              >
                {pickName(c.name)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="font-bold text-sm mb-2">{t('public.fPrice')}</legend>
        <div className="flex items-center gap-2">
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder={t('public.priceMin')}
            aria-label={t('public.priceMin')}
            value={vals.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            className="min-h-[44px] w-full rounded-lg border border-stone-300 px-3"
          />
          <span aria-hidden="true">–</span>
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder={t('public.priceMax')}
            aria-label={t('public.priceMax')}
            value={vals.maxPrice}
            onChange={(e) => set({ maxPrice: e.target.value })}
            className="min-h-[44px] w-full rounded-lg border border-stone-300 px-3"
          />
        </div>
      </fieldset>
      {hasAge && (
        <fieldset>
          <legend className="font-bold text-sm mb-2">{t('public.fAge')}</legend>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {AGE_CHIPS.map((c) => {
              const on = vals.ageMin === c.min && vals.ageMax === c.max;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => set(on ? { ageMin: '', ageMax: '' } : { ageMin: c.min, ageMax: c.max })}
                  className={`min-h-[44px] rounded-full border px-4 text-sm font-bold ${on ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-300'}`}
                >
                  {t(`public.${c.key}`)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <label className="flex items-center gap-2 text-sm font-bold min-h-[44px]">
        <input
          type="checkbox"
          className="w-5 h-5"
          checked={!!vals.inStock}
          onChange={(e) => set({ inStock: e.target.checked })}
        />
        {t('public.inStockOnly')}
      </label>
      <label className="flex items-center gap-2 text-sm font-bold min-h-[44px]">
        <input
          type="checkbox"
          className="w-5 h-5"
          checked={!!vals.onSale}
          onChange={(e) => set({ onSale: e.target.checked })}
        />
        {t('public.onSale')}
      </label>
    </div>
  );
}

// Toolbar (search + filters button + sort + chips) + desktop sidebar + mobile sheet.
export function FilterSidebar({ params, categories, fixedCategory, hasAge, onApply, pickName }) {
  return (
    <aside className="hidden md:block w-60 shrink-0">
      <div className="bg-white rounded-xl shadow-sm p-4 md:sticky md:top-24">
        <FilterBody vals={params} onApply={onApply} immediate categories={categories} fixedCategory={fixedCategory} hasAge={hasAge} pickName={pickName} />
      </div>
    </aside>
  );
}

export default function Filters({
  params,
  activeCount,
  total,
  categories,
  fixedCategory,
  hasAge,
  onSearch,
  onApply,
  onReset,
  pickName,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [q, setQ] = useState(params.search);

  // Search input mirrors URL (e.g. after language switch); typing debounces to URL-replace.
  useEffect(() => {
    setQ(params.search);
  }, [params.search]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== params.search) onSearch(q);
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Bottom-sheet lifecycle: draft copy, scroll lock, Escape to close.
  useEffect(() => {
    if (!open) return;
    setDraft({ ...params });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const applyDraft = () => {
    if (!draft) {
      setOpen(false);
      return;
    }
    const { search: _s, page: _p, ...rest } = draft;
    onApply(rest);
    setOpen(false);
  };

  const chips = [];
  if (params.search) chips.push({ k: 'search', label: `“${params.search}”` });
  if (!fixedCategory && params.category) {
    const c = categories.find((x) => x.slug === params.category || x._id === params.category);
    if (c) chips.push({ k: 'category', label: pickName(c.name) });
  }
  if (params.minPrice !== '' || params.maxPrice !== '') chips.push({ k: 'price', label: `${params.minPrice || '…'}–${params.maxPrice || '…'}` });
  if (params.ageMin !== '' || params.ageMax !== '') chips.push({ k: 'age', label: `${params.ageMin || '…'}–${params.ageMax || '…'}` });
  if (params.inStock) chips.push({ k: 'stock', label: t('public.inStockOnly') });
  if (params.onSale) chips.push({ k: 'sale', label: t('public.onSale') });

  const clearChip = (k) => {
    if (k === 'search') onSearch('');
    else if (k === 'category') onApply({ category: '' });
    else if (k === 'price') onApply({ minPrice: '', maxPrice: '' });
    else if (k === 'age') onApply({ ageMin: '', ageMax: '' });
    else if (k === 'stock') onApply({ inStock: false });
    else if (k === 'sale') onApply({ onSale: false });
  };

  return (
    <div>
      {/* Always-visible search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('public.searchPlaceholder')}
        role="searchbox"
        aria-label={t('public.search')}
        className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-white px-4"
      />
      {/* Filters button + sort row */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="md:hidden min-h-[44px] flex-1 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold"
        >
          {activeCount > 0 ? t('public.filtersN', { n: activeCount }) : t('public.filters')}
        </button>
        <label className="flex items-center gap-2 text-sm font-bold ms-auto">
          <span className="hidden sm:inline">{t('public.sort')}</span>
          <select
            value={params.sort}
            onChange={(e) => onApply({ sort: e.target.value })}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3"
            aria-label={t('public.sort')}
          >
            <option value="newest">{t('public.sortNewest')}</option>
            <option value="price-asc">{t('public.sortPriceAsc')}</option>
            <option value="price-desc">{t('public.sortPriceDesc')}</option>
          </select>
        </label>
      </div>
      {/* Chips + count */}
      <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
        <span className="text-stone-500">{t('public.resultsCount', { n: total })}</span>
        {chips.map((c) => (
          <button key={c.k} type="button" onClick={() => clearChip(c.k)} className="rounded-full bg-stone-200 px-3 py-1 font-bold min-h-[32px]">
            ✕ {c.label}
          </button>
        ))}
        {chips.length > 0 && (
          <button type="button" onClick={onReset} className="font-bold text-brand-600 underline">
            {t('public.clearAll')}
          </button>
        )}
      </div>

      {/* Mobile bottom sheet (draft) */}
      {open && draft && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t('public.filters')}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[85%] bg-white rounded-t-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-extrabold">{t('public.filters')}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('public.clearAll')} className="min-h-[44px] min-w-[44px] text-xl font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterBody vals={draft} setVals={(p) => setDraft((x) => ({ ...x, ...p }))} immediate={false} categories={categories} fixedCategory={fixedCategory} hasAge={hasAge} pickName={pickName} />
            </div>
            <div className="sticky bottom-0 border-t bg-white p-4 flex gap-2">
              <button type="button" onClick={() => { onReset(); setOpen(false); }} className="min-h-[44px] flex-1 rounded-xl border font-bold">
                {t('public.reset')}
              </button>
              <button type="button" onClick={applyDraft} className="min-h-[44px] flex-[2] rounded-xl bg-brand-500 font-bold text-white">
                {t('public.showResults', { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
