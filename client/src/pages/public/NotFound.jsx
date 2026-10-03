import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 404 with quick links (also reused for unknown category/product slugs).
export default function NotFound() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const L = (p) => `/${lang === 'en' ? 'en' : 'ar'}${p}`;

  const links = [
    [L('/'), t('public.homeBreadcrumb')],
    [L('/products'), t('nav.products')],
    [L('/new'), t('nav.new')],
    [L('/supply-lists'), t('nav.supplyLists')],
    [L('/store'), t('nav.store')],
  ];

  return (
    <div className="py-16 text-center">
      <div className="text-6xl" aria-hidden="true">🧭</div>
      <h1 className="mt-2 text-3xl font-extrabold">404</h1>
      <p className="mt-2 text-stone-500">{t('common.notFound')}</p>
      <Link to={L('/')} className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-white font-bold min-h-[44px]">
        {t('common.backHome')}
      </Link>
      <p className="mt-8 text-sm font-bold text-stone-500">{t('public.notFoundLinks')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {links.map(([to, label]) => (
          <Link key={to} to={to} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-bold min-h-[44px] inline-flex items-center">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
