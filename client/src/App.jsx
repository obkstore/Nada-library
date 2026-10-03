import { useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
import i18n, { syncDocumentLang } from './i18n';
import Layout from './components/Layout';
import Home from './pages/public/Home';
import Products from './pages/public/Products';
import ProductDetail from './pages/public/ProductDetail';
import CategoryPage from './pages/public/CategoryPage';
import NewArrivals from './pages/public/NewArrivals';
import SupplyLists from './pages/public/SupplyLists';
import SupplyListDetail from './pages/public/SupplyListDetail';
import StoreInfo from './pages/public/StoreInfo';
import NotFound from './pages/public/NotFound';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ProductsAdmin from './pages/admin/ProductsAdmin';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import SupplyListsAdmin from './pages/admin/SupplyListsAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import ProtectedRoute from './components/admin/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// "/" redirect: ONLY place where localStorage is read (saved language, else 'ar' — change #4).
function RootRedirect() {
  const saved = localStorage.getItem('lang');
  const lang = saved === 'en' || saved === 'ar' ? saved : 'ar';
  return <Navigate to={`/${lang}`} replace />;
}

// Validates :lang and syncs i18n + <html lang/dir>. URL is the source of truth.
function LangGuard({ children }) {
  const { lang } = useParams();
  const { i18n: ctx } = useTranslation();
  if (lang !== 'ar' && lang !== 'en') return <Navigate to="/ar" replace />;
  useEffect(() => {
    void ctx.changeLanguage(lang);
    localStorage.setItem('lang', lang); // side effect only, for future "/" visits
    syncDocumentLang(lang);
  }, [lang, ctx]);
  return children;
}

function LangRoutes() {
  return (
    <LangGuard>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="new" element={<NewArrivals />} />
          <Route path="supply-lists" element={<SupplyLists />} />
          <Route path="supply-lists/:id" element={<SupplyListDetail />} />
          <Route path="store" element={<StoreInfo />} />
          {/* Prefixed admin (per approved plan): /ar/admin + /en/admin, default Arabic */}
          <Route path="admin" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/products" element={<ProductsAdmin />} />
              <Route path="admin/categories" element={<CategoriesAdmin />} />
              <Route path="admin/lists" element={<SupplyListsAdmin />} />
              <Route path="admin/settings" element={<SettingsAdmin />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </LangGuard>
  );
}

export default function App() {
  void i18n; // ensure i18n singleton is initialized
  return (
    <HelmetProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:lang/*" element={<LangRoutes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HelmetProvider>
  );
}
