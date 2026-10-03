import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

// Overview: live counts + links into each section.
export default function Dashboard() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [counts, setCounts] = useState({ products: '…', categories: '…', lists: '…' });
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [me, prods, cats, lists] = await Promise.all([
          api.get('/auth/me'),
          api.get('/products', { params: { limit: 1 } }),
          api.get('/categories'),
          api.get('/supply-lists'),
        ]);
        if (!alive) return;
        setName(me.data.username);
        setCounts({ products: prods.data.total, categories: cats.data.length, lists: lists.data.length });
      } catch {
        if (alive) setCounts({ products: '?', categories: '?', lists: '?' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cards = [
    { to: `/${lang}/admin/products`, num: counts.products, label: t('admin.dashboard.totalProducts'), cta: t('admin.dashboard.manageProducts') },
    { to: `/${lang}/admin/categories`, num: counts.categories, label: t('admin.dashboard.totalCategories'), cta: t('admin.dashboard.manageCategories') },
    { to: `/${lang}/admin/lists`, num: counts.lists, label: t('admin.dashboard.totalLists'), cta: t('admin.dashboard.manageLists') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{t('admin.dashboard.title')}</h1>
      {name && <p className="text-stone-500 mt-1">{t('admin.dashboard.welcome', { name })}</p>}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.to} className="bg-white rounded-xl shadow-sm p-5 text-center">
            <div className="text-3xl font-extrabold text-brand-600">{c.num}</div>
            <div className="text-sm text-stone-500">{c.label}</div>
            <Link to={c.to} className="mt-3 inline-block rounded-full bg-brand-500 px-4 py-1.5 text-sm font-bold text-white">
              {c.cta}
            </Link>
          </div>
        ))}
      </div>
      <Link to={`/${lang}/admin/settings`} className="mt-4 inline-block text-sm font-bold text-brand-600">
        {t('admin.dashboard.openSettings')}
      </Link>
    </div>
  );
}
