import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ListingView from '../../components/ListingView';
import NotFound from './NotFound';
import { useProductListing } from '../../hooks/useProductListing';
import { pickNameFn, useCategories } from '../../hooks/useCategories';
import { useShopName } from '../../hooks/useStoreSettings';
import { siteUrl } from '../../utils/whatsapp';

// Thin page over the shared listing engine: fixedCategory hides the category
// filter. Unknown slugs render NotFound. Canonical URL has no filter params.
export default function CategoryPage() {
  const { t } = useTranslation();
  const { lang, slug } = useParams();
  const categories = useCategories();
  const shopName = useShopName();
  const listing = useProductListing({ fixedCategory: slug });
  const pickName = pickNameFn(lang);
  const site = siteUrl();
  const [category, setCategory] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setMissing(false);
    setCategory(null);
    api
      .get(`/categories/${slug}`)
      .then((r) => alive && setCategory(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (missing) return <NotFound />;

  const name = category ? pickName(category.name) : slug;
  const canonical = `${site}/${lang}/category/${slug}`;

  return (
    <>
      <Helmet>
        <title>{`${name} | ${shopName}`}</title>
        <meta name="description" content={`${name} — ${t('seo.homeDesc')}`} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/category/${slug}`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/category/${slug}`} />
      </Helmet>

      {/* Breadcrumb */}
      <nav className="text-sm text-stone-500" aria-label="breadcrumb">
        <Link to={`/${lang}/`} className="hover:text-brand-600">{t('public.homeBreadcrumb')}</Link>
        {/* Mirrored separator: points forward in both RTL and LTR */}
        <span className="mx-1 rtl:rotate-180 inline-block" aria-hidden="true">›</span>
        <span className="font-bold text-stone-800">{name}</span>
      </nav>

      {/* Header: image or colored banner */}
      <header className="mt-2 rounded-2xl overflow-hidden bg-white shadow-sm">
        {category?.image ? (
          <img src={category.image} alt={name} loading="lazy" className="w-full aspect-[4/1] object-cover" />
        ) : (
          <div className="w-full aspect-[5/1] md:aspect-[7/1] bg-gradient-to-br from-sky-200 via-amber-100 to-brand-200" aria-hidden="true" />
        )}
        <h1 className="p-4 text-2xl font-extrabold">{name}</h1>
      </header>

      {/* Category chip row */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <Link
            key={c._id}
            to={`/${lang}/category/${c.slug}`}
            className={`whitespace-nowrap min-h-[44px] inline-flex items-center rounded-full border px-4 text-sm font-bold ${c.slug === slug ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-300'}`}
            aria-current={c.slug === slug ? 'page' : undefined}
          >
            {pickName(c.name)}
          </Link>
        ))}
      </div>

      <div className="mt-2">
        <ListingView
          listing={listing}
          categories={categories}
          fixedCategory={slug}
          pickName={pickName}
          onSearch={listing.setSearch}
          onApply={listing.applyFilters}
          onReset={listing.resetAll}
          onPage={listing.setPage}
        />
      </div>
    </>
  );
}
