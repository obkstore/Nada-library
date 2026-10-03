import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

// Guards all /:lang/admin/* routes except the login page itself.
// Validates the stored JWT against GET /api/auth/me on mount.
export default function ProtectedRoute() {
  const { lang } = useParams();
  const { t } = useTranslation();
  const [state, setState] = useState('checking'); // checking | ok | no

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setState('no');
      return;
    }
    api
      .get('/auth/me')
      .then(() => setState('ok'))
      .catch(() => {
        localStorage.removeItem('adminToken');
        setState('no');
      });
  }, []);

  if (state === 'checking') return <div className="py-10 text-center">{t('admin.common.loading')}</div>;
  if (state === 'no') return <Navigate to={`/${lang}/admin`} replace />;
  return <Outlet />;
}
