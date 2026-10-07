import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShopName } from '../hooks/useStoreSettings';

// Header with AR/EN switcher + RTL-aware layout (logical ms-/me-/ps-/pe- utilities only).
// The URL prefix is the source of truth; localStorage is updated as a side effect
// so "/" can redirect to the saved language later.
// Shop name comes from StoreSettings (useShopName: settings value, static locale
// fallback while loading). No tagline: StoreSettings has no tagline field.
export default function Layout() {
  const { t, i18n } = useTranslation();
  const shopName = useShopName();
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const switchLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', next);
    // Preserve the rest of the path + query when switching.
    const rest = location.pathname.replace(/^\/(ar|en)/, '') || '/';
    navigate(`/${next}${rest}${location.search}`);
    void i18n.changeLanguage(next);
  };

  const L = (path) => `/${lang}${path}`;

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to={L('/')} className="font-extrabold text-lg text-brand-600">
            {shopName}
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
            <Link to={L('/')} className="hover:text-brand-600">{t('nav.home')}</Link>
            <Link to={L('/products')} className="hover:text-brand-600">{t('nav.products')}</Link>
            <Link to={L('/new')} className="hover:text-brand-600">{t('nav.new')}</Link>
            <Link to={L('/supply-lists')} className="hover:text-brand-600">{t('nav.supplyLists')}</Link>
            <Link to={L('/store')} className="hover:text-brand-600">{t('nav.store')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={switchLang}
              aria-label={t('lang.label')}
              className="rounded-full border border-brand-300 px-3 py-1 text-sm font-bold hover:bg-brand-100"
            >
              {t('lang.switch')}
            </button>
            <Link to={L('/admin')} className="text-xs text-stone-500 hover:text-brand-600">{t('nav.admin')}</Link>
          </div>
        </div>
        {/* Mobile nav: logical start/end alignment works in both RTL and LTR */}
        <nav className="md:hidden border-t border-stone-100">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto text-sm font-semibold text-start">
            <Link to={L('/')} className="whitespace-nowrap">{t('nav.home')}</Link>
            <Link to={L('/products')} className="whitespace-nowrap">{t('nav.products')}</Link>
            <Link to={L('/new')} className="whitespace-nowrap">{t('nav.new')}</Link>
            <Link to={L('/supply-lists')} className="whitespace-nowrap">{t('nav.supplyLists')}</Link>
            <Link to={L('/store')} className="whitespace-nowrap">{t('nav.store')}</Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-4 py-4 text-sm text-stone-500 flex items-center justify-between">
          <span>{shopName}</span>
          {/* Mirrored arrow: points forward in both directions */}
          <span className="rtl:rotate-180 inline-block">→</span>
        </div>
      </footer>
    </div>
  );
}
