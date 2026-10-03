import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Admin shell: section nav (keeps :lang prefix), view-store link, logout.
export default function AdminLayout() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const L = (p) => `/${lang}${p}`;

  const logout = () => {
    localStorage.removeItem('adminToken');
    navigate(L('/admin'));
  };

  const linkCls = 'rounded-lg px-3 py-2 text-sm font-bold hover:bg-brand-100 whitespace-nowrap';

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <aside className="md:w-52 shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto bg-white rounded-xl p-2 shadow-sm">
          <Link to={L('/admin/dashboard')} className={linkCls}>{t('admin.nav.dashboard')}</Link>
          <Link to={L('/admin/products')} className={linkCls}>{t('admin.nav.products')}</Link>
          <Link to={L('/admin/categories')} className={linkCls}>{t('admin.nav.categories')}</Link>
          <Link to={L('/admin/lists')} className={linkCls}>{t('admin.nav.lists')}</Link>
          <Link to={L('/admin/settings')} className={linkCls}>{t('admin.nav.settings')}</Link>
          <Link to={L('/')} className={linkCls + ' text-stone-500'}>{t('admin.nav.viewStore')}</Link>
          <button onClick={logout} className={linkCls + ' text-red-600 text-start'}>
            {t('admin.nav.logout')}
          </button>
        </nav>
      </aside>
      <section className="flex-1 min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
