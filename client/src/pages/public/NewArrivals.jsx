import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import ListingView from '../../components/ListingView';
import { useProductListing } from '../../hooks/useProductListing';
import { pickNameFn, useCategories } from '../../hooks/useCategories';
import { siteUrl } from '../../utils/whatsapp';

// New Arrivals: same engine with isNewArrival (+ recent products server-side).
export default function NewArrivals() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const categories = useCategories();
  const listing = useProductListing({ newOnly: true });
  const pickName = pickNameFn(lang);
  const site = siteUrl();

  return (
    <>
      <Helmet>
        <title>{`${t('public.seoNew')} | ${t('brand')}`}</title>
        <meta name="description" content={t('seo.homeDesc')} />
        <link rel="canonical" href={`${site}/${lang}/new`} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/new`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/new`} />
      </Helmet>
      <h1 className="text-2xl font-extrabold mb-4">{t('public.seoNew')}</h1>
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
