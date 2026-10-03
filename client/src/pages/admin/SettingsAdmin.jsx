import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import BilingualField from '../../components/admin/BilingualField';
import BilingualTextarea from '../../components/admin/BilingualTextarea';
import { findStripped } from '../../utils/stripHtml';

// Store settings form + change-password section (current + new, min 8).
export default function SettingsAdmin() {
  const { t } = useTranslation();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((r) => setS(r.data))
      .catch(() => setError(t('admin.common.loadFailed')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPath = (path, value) => {
    setS((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let o = next;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      return next;
    });
  };
  const g = (path) => path.split('.').reduce((o, k) => (o ? o[k] : ''), s) || '';

  const save = async (e) => {
    e.preventDefault();
    const stripped = findStripped([
      { label: t('admin.settings.nameAr'), value: g('storeName.ar') },
      { label: t('admin.settings.addressAr'), value: g('address.ar') },
      { label: t('admin.settings.hoursAr'), value: g('hours.ar') },
    ]);
    setNotice(stripped.length > 0 ? t('admin.settings.strippedNotice', { fields: stripped.join('، ') }) : '');
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.put('/settings', s);
      setS(res.data);
      setSaved(true);
    } catch {
      setError(t('admin.common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    if (!next || next.length < 8) {
      setPwErr(t('admin.settings.pwLength'));
      return;
    }
    setPwBusy(true);
    try {
      await api.put('/auth/password', { currentPassword: cur, newPassword: next });
      setPwMsg(t('admin.settings.pwChanged'));
      setCur('');
      setNext('');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || '';
      if (status === 401) setPwErr(t('admin.settings.pwWrong'));
      else if (status === 400 && msg) setPwErr(msg);
      else setPwErr(t('admin.common.saveFailed'));
    } finally {
      setPwBusy(false);
    }
  };

  if (loading) return <p className="py-8 text-center">{t('admin.common.loading')}</p>;
  if (!s) return <p className="py-8 text-center text-red-600 font-bold">{error || t('admin.common.loadFailed')}</p>;

  const input = 'mt-1 w-full rounded-lg border border-stone-300 px-3 py-2';

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{t('admin.settings.title')}</h1>
      <form onSubmit={save} className="mt-4 space-y-5 bg-white rounded-xl shadow-sm p-5">
        <section>
          <h2 className="font-extrabold mb-2">{t('admin.settings.storeSection')}</h2>
          <div className="space-y-3">
            <BilingualField labelAr={t('admin.settings.nameAr')} labelEn={t('admin.settings.nameEn')} valueAr={g('storeName.ar')} valueEn={g('storeName.en')} onAr={(v) => setPath('storeName.ar', v)} onEn={(v) => setPath('storeName.en', v)} max={200} />
            <BilingualField labelAr={t('admin.settings.addressAr')} labelEn={t('admin.settings.addressEn')} valueAr={g('address.ar')} valueEn={g('address.en')} onAr={(v) => setPath('address.ar', v)} onEn={(v) => setPath('address.en', v)} max={500} />
            <BilingualTextarea labelAr={t('admin.settings.hoursAr')} labelEn={t('admin.settings.hoursEn')} valueAr={g('hours.ar')} valueEn={g('hours.en')} onAr={(v) => setPath('hours.ar', v)} onEn={(v) => setPath('hours.en', v)} max={500} rows={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold">{t('admin.settings.phone')}</span>
                <input dir="ltr" value={g('phone')} onChange={(e) => setPath('phone', e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="text-sm font-bold">{t('admin.settings.whatsapp')}</span>
                <input dir="ltr" value={g('whatsappNumber')} onChange={(e) => setPath('whatsappNumber', e.target.value)} className={input} />
                <span className="block text-xs text-stone-400">{t('admin.settings.whatsappHint')}</span>
              </label>
            </div>
          </div>
        </section>
        <section>
          <h2 className="font-extrabold mb-2">{t('admin.settings.currencySection')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.code')}</span><input dir="ltr" value={g('currency.code')} onChange={(e) => setPath('currency.code', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.symbolAr')}</span><input value={g('currency.symbol.ar')} onChange={(e) => setPath('currency.symbol.ar', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.symbolEn')}</span><input dir="ltr" value={g('currency.symbol.en')} onChange={(e) => setPath('currency.symbol.en', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.decimals')}</span><input type="number" min="0" max="3" value={g('currency.decimals')} onChange={(e) => setPath('currency.decimals', Number(e.target.value))} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.position')}</span>
              <select value={g('currency.symbolPosition')} onChange={(e) => setPath('currency.symbolPosition', e.target.value)} className={input}>
                <option value="after">{t('admin.settings.after')}</option>
                <option value="before">{t('admin.settings.before')}</option>
              </select>
            </label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.digitsLabel')}</span>
              <select value={g('digitStyle')} onChange={(e) => setPath('digitStyle', e.target.value)} className={input}>
                <option value="western">{t('admin.settings.western')}</option>
                <option value="arabic-indic">{t('admin.settings.arabicIndic')}</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.currencyNameAr')}</span><input value={g('currency.name.ar')} onChange={(e) => setPath('currency.name.ar', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.currencyNameEn')}</span><input dir="ltr" value={g('currency.name.en')} onChange={(e) => setPath('currency.name.en', e.target.value)} className={input} /></label>
          </div>
        </section>
        <section>
          <h2 className="font-extrabold mb-2">{t('admin.settings.socialSection')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.facebook')}</span><input dir="ltr" value={g('social.facebook')} onChange={(e) => setPath('social.facebook', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.instagram')}</span><input dir="ltr" value={g('social.instagram')} onChange={(e) => setPath('social.instagram', e.target.value)} className={input} /></label>
            <label className="block"><span className="text-sm font-bold">{t('admin.settings.tiktok')}</span><input dir="ltr" value={g('social.tiktok')} onChange={(e) => setPath('social.tiktok', e.target.value)} className={input} /></label>
          </div>
        </section>
        <section>
          <h2 className="font-extrabold mb-2">{t('admin.settings.mapSection')}</h2>
          <label className="block">
            <span className="text-sm font-bold">{t('admin.settings.mapUrl')}</span>
            <input dir="ltr" value={g('mapEmbedUrl')} onChange={(e) => setPath('mapEmbedUrl', e.target.value)} className={input} />
          </label>
        </section>
        {notice && <p className="text-sm font-bold text-amber-600">{notice}</p>}
        {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
        {saved && <p className="text-sm text-green-700 font-bold">{t('admin.settings.saved')}</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 font-bold text-white disabled:opacity-50">{t('admin.common.save')}</button>
      </form>

      <form onSubmit={changePw} className="mt-4 bg-white rounded-xl shadow-sm p-5 max-w-md">
        <h2 className="font-extrabold mb-2">{t('admin.settings.pwSection')}</h2>
        <label className="block">
          <span className="text-sm font-bold">{t('admin.settings.currentPw')}</span>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required autoComplete="current-password" className={input} />
        </label>
        <label className="block mt-3">
          <span className="text-sm font-bold">{t('admin.settings.newPw')}</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" className={input} />
        </label>
        {pwErr && <p className="mt-2 text-sm text-red-600 font-bold">{pwErr}</p>}
        {pwMsg && <p className="mt-2 text-sm text-green-700 font-bold">{pwMsg}</p>}
        <button type="submit" disabled={pwBusy} className="mt-3 rounded-lg bg-stone-800 px-6 py-2 font-bold text-white disabled:opacity-50">{t('admin.settings.changePw')}</button>
      </form>
    </div>
  );
}
