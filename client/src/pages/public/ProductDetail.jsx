import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ProductImage from '../../components/ProductImage';
import NotFound from './NotFound';
import { pickLang, useShopName, useStoreSettings } from '../../hooks/useStoreSettings';
import { formatPrice } from '../../utils/formatPrice';
import { discountPct, effectivePrice, hasSale, showPctBadge } from '../../utils/prices';
import { cleanWhatsapp, productPageUrl, waProductLink } from '../../utils/whatsapp';
import { siteUrl } from '../../utils/whatsapp';

// Detail: gallery (or one large placeholder), price, plain-text description,
// stock status, category link, WhatsApp order button (kept for out-of-stock
// with an availability message — change 9), copy-link button.
export default function ProductDetail() {
  const { t, i18n } = useTranslation();
  const { lang, slug } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const settings = useStoreSettings();
  const shopName = useShopName();
  const [product, setProduct] = useState(null);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setMissing(false);
    setProduct(null);
    setActive(0);
    api
      .get(`/products/${slug}`)
      .then((r) => alive && setProduct(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (missing) return <NotFound />;
  if (!product) return <p className="py-10 text-center">{t('admin.common.loading')}</p>;

  const name = pickLang(product.name, cur);
  const desc = pickLang(product.description, cur);
  // WhatsApp + display use the effective (offer) price.
  const price = formatPrice(effectivePrice(product), settings, cur);
  const sale = hasSale(product);
  const inStock = product.stockStatus !== 'out';
  const waNumber = cleanWhatsapp(settings?.whatsappNumber);
  const pageUrl = productPageUrl(product.slug, lang);
  const waLink = waNumber ? waProductLink(waNumber, { name, price, url: pageUrl, lang, inStock }) : '';
  const site = siteUrl();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${name} | ${shopName}`}</title>
        <meta name="description" content={desc.slice(0, 160)} />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="ar" href={productPageUrl(product.slug, 'ar')} />
        <link rel="alternate" hrefLang="en" href={productPageUrl(product.slug, 'en')} />
      </Helmet>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gallery */}
        <div>
          {(product.images?.length || 0) === 0 ? (
            <ProductImage src="" categorySlug={product.category?.slug || ''} alt={name} className="w-full aspect-square rounded-2xl" />
          ) : (
            <>
              <ProductImage
                src={product.images[active]}
                categorySlug={product.category?.slug || ''}
                alt={name}
                className="w-full aspect-square rounded-2xl"
              />
              {product.images.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {product.images.map((u, i) => (
                    <button key={u + i} type="button" onClick={() => setActive(i)} aria-label={`${i + 1}`} className={`shrink-0 rounded-lg overflow-hidden border-2 ${i === active ? 'border-brand-500' : 'border-transparent'}`}>
                      <img src={u} alt="" loading="lazy" className="w-16 h-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div>
          {product.isNewArrival && (
            <span className="inline-block rounded-full bg-brand-500 text-white text-xs px-2 py-0.5 font-bold">{t('public.newBadge')}</span>
          )}
          {sale && showPctBadge(product) && (
            <span className="inline-block rounded-full bg-red-600 text-white text-xs px-2 py-0.5 font-bold ms-2" dir="ltr">{t('public.saleBadge', { n: discountPct(product) })}</span>
          )}
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold">{name}</h1>
          <p className="mt-2 text-2xl font-extrabold text-brand-600">
            {sale ? (
              <>
                <s className="me-2 text-lg font-normal text-stone-400">{formatPrice(product.price, settings, cur)}</s>
                {price}
              </>
            ) : (
              price
            )}
          </p>
          <p className={`mt-2 text-sm font-bold ${inStock ? 'text-green-700' : 'text-red-600'}`}>
            {inStock ? t('public.inStock') : t('public.outOfStock')}
          </p>
          {(product.ageMin != null || product.ageMax != null) && (
            <p className="mt-1 text-sm text-stone-500">
              {product.ageMax != null
                ? t('public.ageRange', { min: product.ageMin ?? '?', max: product.ageMax })
                : t('public.ageMinOnly', { min: product.ageMin })}
            </p>
          )}
          {product.category && (
            <p className="mt-1 text-sm">
              {t('public.category')}:{' '}
              <Link to={`/${lang}/category/${product.category.slug}`} className="font-bold text-brand-600">
                {pickLang(product.category.name, cur)}
              </Link>
            </p>
          )}
          <h2 className="mt-4 font-extrabold">{t('public.description')}</h2>
          <p className="mt-1 text-stone-700 whitespace-pre-line">{desc}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center rounded-full bg-green-600 px-6 py-2.5 font-bold text-white hover:bg-green-700"
              >
                {inStock ? t('public.orderWhatsapp') : t('public.askAvailability')}
              </a>
            )}
            <button type="button" onClick={copyLink} className="min-h-[44px] rounded-full border border-stone-300 px-6 py-2.5 text-sm font-bold">
              {copied ? t('public.copied') : t('public.shareLink')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
