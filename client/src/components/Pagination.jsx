import { useTranslation } from 'react-i18next';

// Push-based page navigation (back button friendly). Parent scrolls to grid top (change 5).
export default function Pagination({ page, pages, onPage }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 font-bold disabled:opacity-40"
      >
        {t('admin.common.prev')}
      </button>
      <span className="text-stone-500">{t('admin.common.pageOf', { page, pages })}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 font-bold disabled:opacity-40"
      >
        {t('admin.common.next')}
      </button>
    </div>
  );
}
