import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Shared product image with bilingual inline-SVG placeholder (no network, no files).
// Icon matches known category slugs, generic box otherwise (change 1).
// Same box size either way so grids never shift. RTL/LTR-neutral.
function PlaceholderIcon({ slug }) {
  const common = 'w-1/3 h-1/3';
  if (slug === 'stationery' || slug === 'school-supplies') {
    // Pencil
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 20l1.2-4.2L16.5 4.5a2.1 2.1 0 013 3L8.2 18.8 4 20z" strokeLinejoin="round" />
        <path d="M14.5 6.5l3 3" strokeLinecap="round" />
      </svg>
    );
  }
  if (slug === 'toys') {
    // Toy block
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="4" y="9" width="16" height="11" rx="2" />
        <path d="M8 9V6.5A1.5 1.5 0 019.5 5h5A1.5 1.5 0 0116 6.5V9" />
        <circle cx="9.5" cy="14" r="1" fill="currentColor" />
        <circle cx="14.5" cy="14" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (slug === 'books') {
    // Book
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M5 5.5A1.5 1.5 0 016.5 4H19v15H6.5A1.5 1.5 0 005 20.5V5.5z" strokeLinejoin="round" />
        <path d="M5 18.5h14" strokeLinecap="round" />
      </svg>
    );
  }
  if (slug === 'art-supplies') {
    // Palette
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 4a8 8 0 100 16c1.5 0 2-1 1.3-2-.6-1 0-2.2 1.2-2.2H17a4 4 0 004-4c0-4.4-4-7.8-9-7.8z" strokeLinejoin="round" />
        <circle cx="8.5" cy="10" r="1" fill="currentColor" />
        <circle cx="12" cy="7.8" r="1" fill="currentColor" />
        <circle cx="15.5" cy="10" r="1" fill="currentColor" />
      </svg>
    );
  }
  // Generic box
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" strokeLinejoin="round" />
      <path d="M4 8l8 4 8-4M12 12v8" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductImage({ src, categorySlug = '', alt = '', className = '', imgClassName = '' }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div className={`bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100 text-brand-600 flex items-center justify-center overflow-hidden ${className}`} role="img" aria-label={alt || t('public.noImage')}>
      {showPlaceholder ? (
        <PlaceholderIcon slug={categorySlug} />
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`w-full h-full object-cover ${imgClassName}`} />
      )}
    </div>
  );
}
