import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

// Admin sign-in. Stores JWT in localStorage (attached by api interceptor).
// Already-authed admins bounce straight to the dashboard.
export default function Login() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      setChecking(false);
      return;
    }
    api
      .get('/auth/me')
      .then(() => navigate(`/${lang}/admin/dashboard`, { replace: true }))
      .catch(() => {
        localStorage.removeItem('adminToken');
        setChecking(false);
      });
  }, [lang, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('adminToken', res.data.token);
      navigate(`/${lang}/admin/dashboard`);
    } catch (err) {
      const status = err.response?.status;
      setError(status === 429 ? t('admin.login.rateLimited') : t('admin.login.error'));
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <div className="py-10 text-center">{t('admin.login.checking')}</div>;

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-extrabold text-center">{t('admin.login.title')}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 bg-white rounded-xl shadow-sm p-5">
        <label className="block">
          <span className="text-sm font-bold">{t('admin.login.username')}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('admin.login.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-bold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {t('admin.login.submit')}
        </button>
      </form>
    </div>
  );
}
