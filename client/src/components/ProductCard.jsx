import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductImage from './ProductImage';
import { pickLang, useStoreSettings } from '../hooks/useStoreSettings';
import { formatPrice } from '../utils/formatPrice';
import { discountPct, effectivePrice, hasSale, showPctBadge } from '../utils/prices';

// Grid card: image (or placeholder), bilingual name, price (+ crossed regular
// and % badge on offers), badges. Logical utilities only.
export default function ProductCard({ product }) {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const settings = useStoreSettings();
  const inStock = product.stockStatus !== 'out';
  const sale = hasSale(product);
  const pct = discountPct(product);

  return (
    <Link
      to={`/${lang}/products/${product.slug}`}
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative">
        <ProductImage
          src={product.images?.[0]}
          categorySlug={product.category?.slug || ''}
          alt={pickLang(product.name, cur)}
          className="w-full aspect-square"
        />
        {product.isNewArrival && (
          <span className="absolute top-2 start-2 rounded-full bg-brand-500 text-white text-xs px-2 py-0.5 font-bold">
            {t('public.newBadge')}
          </span>
        )}
        {sale && showPctBadge(product) && (
          <span className="absolute top-2 end-2 rounded-full bg-red-600 text-white text-xs px-2 py-0.5 font-bold" dir="ltr">
            {t('public.saleBadge', { n: pct })}
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-stone-900/70 text-white text-xs text-center py-1 font-bold">
            {t('public.outOfStock')}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-bold text-sm leading-snug">{pickLang(product.name, cur)}</h3>
        {(product.ageMin != null || product.ageMax != null) && (
          <span className="text-xs text-stone-500">
            {product.ageMax != null
              ? t('public.ageRange', { min: product.ageMin ?? '?', max: product.ageMax })
              : t('public.ageMinOnly', { min: product.ageMin })}
          </span>
        )}
        <span className="mt-auto font-extrabold text-brand-600">
          {sale ? (
            <>
              <s className="me-1.5 text-sm font-normal text-stone-400">{formatPrice(product.price, settings, cur)}</s>
              {formatPrice(effectivePrice(product), settings, cur)}
            </>
          ) : (
            formatPrice(product.price, settings, cur)
          )}
        </span>
      </div>
    </Link>
  );
}
