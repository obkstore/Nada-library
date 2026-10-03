import { useTranslation } from 'react-i18next';

// Generic Phase-0 placeholder used for all not-yet-built public pages.
// Full implementations (filters, WhatsApp, totals, map…) land in Phase 4.
export default function Placeholder({ title }) {
  const { t } = useTranslation();
  return (
    <div className="py-10 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-stone-500">{t('common.phaseTodo')}</p>
    </div>
  );
}
