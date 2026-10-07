import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { pickLang, useShopName, useStoreSettings } from '../../hooks/useStoreSettings';
import { formatPrice } from '../../utils/formatPrice';
import { siteUrl } from '../../utils/whatsapp';

// Supply-list index: title, grade/school, item count, total price.
export default function SupplyLists() {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const settings = useStoreSettings();
  const shopName = useShopName();
  const [lists, setLists] = useState(null);
  const site = siteUrl();

  useEffect(() => {
    let alive = true;
    api
      .get('/supply-lists')
      .then((r) => alive && setLists(r.data))
      .catch(() => alive && setLists([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>{`${t('public.seoLists')} | ${shopName}`}</title>
        <meta name="description" content={t('seo.homeDesc')} />
        <link rel="canonical" href={`${site}/${lang}/supply-lists`} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/supply-lists`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/supply-lists`} />
      </Helmet>
      <h1 className="text-2xl font-extrabold mb-4">{t('public.seoLists')}</h1>
      {lists === null ? (
        <p className="py-8 text-center">{t('admin.common.loading')}</p>
      ) : lists.length === 0 ? (
        <p className="py-8 text-center text-stone-500">{t('public.emptyLists')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map((l) => (
            <Link key={l._id} to={`/${lang}/supply-lists/${l._id}`} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md block">
              <h2 className="font-extrabold text-lg">{pickLang(l.title, cur)}</h2>
              {pickLang(l.grade, cur) && <p className="text-sm text-stone-500">{pickLang(l.grade, cur)}</p>}
              <p className="mt-2 text-sm">
                {t('public.listItems')}: {l.items?.length || 0} · {t('public.total')}:{' '}
                {l.offerValid ? (
                  <>
                    <s className="text-stone-400">{formatPrice(l.regularTotal, settings, cur)}</s>{' '}
                    <span className="font-extrabold text-brand-600">{formatPrice(l.bundlePrice, settings, cur)}</span>{' '}
                    <span dir={cur === 'en' ? 'ltr' : undefined} className="inline-block rounded-full bg-red-600 text-white text-xs px-2 py-0.5 font-bold">
                      {t('public.saveBadge', { amount: formatPrice(l.savings, settings, cur) })}
                    </span>
                  </>
                ) : (
                  <span className="font-extrabold">{formatPrice(l.regularTotal ?? l.totalPrice, settings, cur)}</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
