import { useTranslation } from 'react-i18next';

// Skeleton grid (first load) + empty state with Clear-filters action.
export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden">
          <div className="aspect-square bg-stone-200 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded bg-stone-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-stone-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyResults({ onClear }) {
  const { t } = useTranslation();
  return (
    <div className="py-12 text-center">
      <div className="text-4xl" aria-hidden="true">🧸</div>
      <h2 className="mt-2 font-extrabold">{t('public.noResults')}</h2>
      <p className="mt-1 text-sm text-stone-500">{t('public.noResultsHint')}</p>
      <button type="button" onClick={onClear} className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white min-h-[44px]">
        {t('public.clearFilters')}
      </button>
    </div>
  );
}
