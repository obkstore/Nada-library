import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ProductImage from '../../components/ProductImage';
import NotFound from './NotFound';
import { pickLang, useShopName, useStoreSettings } from '../../hooks/useStoreSettings';
import { formatPrice } from '../../utils/formatPrice';
import { effectivePrice } from '../../utils/prices';
import { cleanWhatsapp, supplyListPageUrl, waSupplyListLink } from '../../utils/whatsapp';

// Supply-list detail: effective-price lines, offer totals + Save badge when
// offerValid, out-of-stock note (change 6), renamed WhatsApp set button.
export default function SupplyListDetail() {
  const { t, i18n } = useTranslation();
  const { lang, id } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const settings = useStoreSettings();
  const shopName = useShopName();
  const [list, setList] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setMissing(false);
    setList(null);
    api
      .get(`/supply-lists/${id}`)
      .then((r) => alive && setList(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (missing) return <NotFound />;
  if (!list) return <p className="py-10 text-center">{t('admin.common.loading')}</p>;

  const title = pickLang(list.title, cur);
  const regular = list.regularTotal ?? list.totalPrice;
  const offer = !!list.offerValid;
  const shownTotal = offer ? list.bundlePrice : regular;
  const total = formatPrice(shownTotal, settings, cur);
  const hasOut = (list.items || []).some((it) => it.product && it.product.stockStatus === 'out');
  const waNumber = cleanWhatsapp(settings?.whatsappNumber);
  const pageUrl = supplyListPageUrl(list._id, lang);
  const lines = (list.items || [])
    .filter((it) => it.product)
    .map((it) => `• ${pickLang(it.product.name, cur)} ×${it.qty} — ${formatPrice(effectivePrice(it.product) * it.qty, settings, cur)}`);
  const waLink = waNumber ? waSupplyListLink(waNumber, { title, lines, total, url: pageUrl, lang }) : '';

  return (
    <>
      <Helmet>
        <title>{`${title} | ${shopName}`}</title>
        <meta name="description" content={`${title} — ${t('seo.homeDesc')}`} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <nav className="text-sm text-stone-500" aria-label="breadcrumb">
        <Link to={`/${lang}/supply-lists`} className="hover:text-brand-600">{t('public.seoLists')}</Link>
        <span className="mx-1 rtl:rotate-180 inline-block" aria-hidden="true">›</span>
        <span className="font-bold text-stone-800">{title}</span>
      </nav>

      <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
      {(pickLang(list.grade, cur) || pickLang(list.school, cur)) && (
        <p className="text-sm text-stone-500">
          {[pickLang(list.school, cur), pickLang(list.grade, cur)].filter(Boolean).join(' · ')}
        </p>
      )}
      {hasOut && <p className="mt-1 text-sm font-bold text-amber-600">{t('public.outOfStockNote')}</p>}

      <ul className="mt-4 space-y-2">
        {(list.items || []).map((it, i) =>
          it.product ? (
            <li key={i}>
              <Link to={`/${lang}/products/${it.product.slug}`} className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-3 hover:shadow-md">
                <ProductImage src={it.product.images?.[0]} categorySlug="" alt={pickLang(it.product.name, cur)} className="w-16 h-16 rounded-lg shrink-0" />
                <span className="flex-1 font-bold text-sm">
                  {pickLang(it.product.name, cur)}
                  {it.product.stockStatus === 'out' && <span className="block text-xs font-bold text-red-600">{t('public.outOfStock')}</span>}
                </span>
                <span className="text-sm text-stone-500 whitespace-nowrap" dir="ltr">×{it.qty}</span>
                <span className="text-sm font-extrabold text-brand-600 whitespace-nowrap">{formatPrice(effectivePrice(it.product) * it.qty, settings, cur)}</span>
              </Link>
            </li>
          ) : null
        )}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-2 bg-white rounded-xl shadow-sm p-4">
        <span className="font-extrabold">{t('public.total')}</span>
        <span className="text-xl font-extrabold text-brand-600">
          {offer ? (
            <>
              <s className="me-2 text-base font-normal text-stone-400">{formatPrice(regular, settings, cur)}</s>
              {total}{' '}
              <span dir={cur === 'en' ? 'ltr' : undefined} className="inline-block rounded-full bg-red-600 text-white text-xs px-2 py-0.5 font-bold align-middle">
                {t('public.saveBadge', { amount: formatPrice(list.savings, settings, cur) })}
              </span>
            </>
          ) : (
            total
          )}
        </span>
      </div>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 min-h-[44px] inline-flex items-center rounded-full bg-green-600 px-8 py-3 font-bold text-white hover:bg-green-700"
        >
          {t('public.askSet')}
        </a>
      )}
    </>
  );
}
