import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ProductCard from '../../components/ProductCard';
import { pickLang, useStoreSettings } from '../../hooks/useStoreSettings';
import { pickNameFn, useCategories } from '../../hooks/useCategories';
import { formatPrice } from '../../utils/formatPrice';
import { siteUrl } from '../../utils/whatsapp';

// Home: hero, featured categories, New Arrivals, on-sale strip, ready sets,
// supply-list shortcut, store preview. Offer sections hide when empty.
export default function Home() {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const settings = useStoreSettings();
  const categories = useCategories();
  const pickName = pickNameFn(lang);
  const [fresh, setFresh] = useState([]);
  const [lists, setLists] = useState([]);
  const [sale, setSale] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get('/products/new').then((r) => alive && setFresh(r.data.slice(0, 8))).catch(() => {});
    api.get('/supply-lists').then((r) => alive && setLists(r.data.slice(0, 1))).catch(() => {});
    // On-sale strip (max 8) + featured offer sets (valid offers only, max 4).
    api.get('/products', { params: { onSale: 'true', limit: 8 } }).then((r) => alive && setSale(r.data.data)).catch(() => {});
    api.get('/supply-lists', { params: { featured: 'true' } }).then((r) => alive && setFeatured(r.data.filter((l) => l.offerValid).slice(0, 4))).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const firstList = lists[0];
  const site = siteUrl();

  return (
    <>
      <Helmet>
        <title>{t('seo.homeTitle')}</title>
        <meta name="description" content={t('seo.homeDesc')} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/`} />
      </Helmet>

      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-orange-500 text-white px-6 py-12 md:py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold">{t('home.heroTitle')}</h1>
        <p className="mt-3 text-white/90">{t('home.heroSubtitle')}</p>
        <Link to={`/${lang}/products`} className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-bold text-brand-600 min-h-[44px]">
          {t('home.cta')}
        </Link>
      </section>

      {/* Featured categories */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{t('home.featured')}</h2>
          <Link to={`/${lang}/products`} className="text-sm font-bold text-brand-600">{t('public.viewAll')}</Link>
        </div>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">{t('public.emptyCategories')}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((c) => (
              <Link key={c._id} to={`/${lang}/category/${c.slug}`} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md">
                {c.image ? (
                  <img src={c.image} alt={pickName(c.name)} loading="lazy" className="w-full aspect-[2/1] object-cover" />
                ) : (
                  <div className="w-full aspect-[2/1] bg-gradient-to-br from-sky-100 to-amber-100" aria-hidden="true" />
                )}
                <div className="p-2 text-center text-sm font-bold">{pickName(c.name)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{t('home.newArrivals')}</h2>
          <Link to={`/${lang}/new`} className="text-sm font-bold text-brand-600">{t('public.viewAll')}</Link>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {fresh.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* On-sale strip (hidden when empty) */}
      {sale.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{t('public.onSale')}</h2>
            <Link to={`/${lang}/products?onSale=true`} className="text-sm font-bold text-brand-600">{t('public.viewAll')}</Link>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {sale.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Ready sets and offers (featured + valid offer only, hidden when empty) */}
      {featured.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{t('public.readySets')}</h2>
            <Link to={`/${lang}/supply-lists`} className="text-sm font-bold text-brand-600">{t('public.viewAll')}</Link>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {featured.map((l) => (
              <Link key={l._id} to={`/${lang}/supply-lists/${l._id}`} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md block">
                <h3 className="font-extrabold text-lg">{pickName(l.title)}</h3>
                <p className="mt-2 text-sm">
                  {t('public.listItems')}: {l.items?.length || 0} ·{' '}
                  <s className="text-stone-400">{formatPrice(l.regularTotal, settings, cur)}</s>{' '}
                  <span className="font-extrabold text-brand-600">{formatPrice(l.bundlePrice, settings, cur)}</span>{' '}
                  <span dir={cur === 'en' ? 'ltr' : undefined} className="inline-block rounded-full bg-red-600 text-white text-xs px-2 py-0.5 font-bold">
                    {t('public.saveBadge', { amount: formatPrice(l.savings, settings, cur) })}
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Supply shortcut + store preview */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-sm p-5">
          <h2 className="text-xl font-extrabold">{t('home.supplyShortcut')}</h2>
          {firstList ? (
            <>
              <p className="mt-1 font-bold text-stone-600">{pickName(firstList.title)}</p>
              <Link to={`/${lang}/supply-lists/${firstList._id}`} className="mt-3 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white min-h-[44px]">
                {t('public.supplyCta')}
              </Link>
            </>
          ) : (
            <Link to={`/${lang}/supply-lists`} className="mt-3 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white min-h-[44px]">
              {t('public.supplyCta')}
            </Link>
          )}
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-5">
          <h2 className="text-xl font-extrabold">{t('home.storePreview')}</h2>
          <p className="mt-1 font-bold">{pickLang(settings?.storeName, cur)}</p>
          {pickLang(settings?.address, cur) && <p className="text-sm text-stone-500">{pickLang(settings?.address, cur)}</p>}
          {pickLang(settings?.hours, cur) && <p className="text-sm text-stone-500">{pickLang(settings?.hours, cur)}</p>}
          <Link to={`/${lang}/store`} className="mt-3 inline-block rounded-full border border-brand-500 px-6 py-2.5 text-sm font-bold text-brand-600 min-h-[44px]">
            {t('public.visitUs')}
          </Link>
        </div>
      </section>

    </>
  );
}
