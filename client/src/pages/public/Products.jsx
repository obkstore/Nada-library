import { Helmet } from 'react-helmet-async';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ListingView from '../../components/ListingView';
import { useProductListing } from '../../hooks/useProductListing';
import { pickNameFn, useCategories } from '../../hooks/useCategories';
import { useShopName } from '../../hooks/useStoreSettings';
import { siteUrl } from '../../utils/whatsapp';

// Product listing: search + filters synced to query params (?category=slug
// redirects to the category page with REPLACE — change 6).
export default function Products() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [sp] = useSearchParams();
  const categories = useCategories();
  const shopName = useShopName();
  const listing = useProductListing({});
  const pickName = pickNameFn(lang);
  const site = siteUrl();

  const catParam = sp.get('category');
  if (catParam) {
    const rest = new URLSearchParams(sp);
    rest.delete('category');
    const qs = rest.toString();
    return <Navigate to={`/${lang}/category/${catParam}${qs ? `?${qs}` : ''}`} replace />;
  }

  const canonical = `${site}/${lang}/products`;

  return (
    <>
      <Helmet>
        <title>{`${t('public.seoProducts')} | ${shopName}`}</title>
        <meta name="description" content={t('seo.homeDesc')} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/products`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/products`} />
      </Helmet>
      <h1 className="text-2xl font-extrabold mb-4">{t('public.seoProducts')}</h1>
      <ListingView
        listing={listing}
        categories={categories}
        fixedCategory=""
        pickName={pickName}
        onSearch={listing.setSearch}
        onApply={listing.applyFilters}
        onReset={listing.resetAll}
        onPage={listing.setPage}
      />
    </>
  );
}
