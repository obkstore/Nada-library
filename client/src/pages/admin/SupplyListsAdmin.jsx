import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import BilingualField from '../../components/admin/BilingualField';
import { findStripped } from '../../utils/stripHtml';
import { formatPrice } from '../../utils/formatPrice';
import { effectivePrice } from '../../utils/prices';
import { useStoreSettings } from '../../hooks/useStoreSettings';

// Supply-list builder: bilingual title/school/grade + product picker with
// quantities. Grand total updates live from the picked products' prices.
export default function SupplyListsAdmin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [schoolAr, setSchoolAr] = useState('');
  const [schoolEn, setSchoolEn] = useState('');
  const [gradeAr, setGradeAr] = useState('');
  const [gradeEn, setGradeEn] = useState('');
  const [active, setActive] = useState(true);
  const [bundle, setBundle] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bundleErr, setBundleErr] = useState('');
  const [picked, setPicked] = useState([]); // [{ id, slug, name, price, salePrice, qty }]
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const settings = useStoreSettings();
  const fmt = (v) => formatPrice(v, settings, lang);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/supply-lists');
      setItems(res.data);
    } catch {
      setError(t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { search: query, limit: 8 } });
        setResults(res.data.data.filter((p) => !picked.some((x) => x.id === p._id)));
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, editing]);

  const reset = (l) => {
    setTitleAr(l?.title?.ar || ''); setTitleEn(l?.title?.en || '');
    setSchoolAr(l?.school?.ar || ''); setSchoolEn(l?.school?.en || '');
    setGradeAr(l?.grade?.ar || ''); setGradeEn(l?.grade?.en || '');
    setActive(l ? !!l.isActive : true);
    // storedBundlePrice keeps the RAW value so a stale offer still shows for fixing.
    setBundle(l && l.storedBundlePrice != null ? String(l.storedBundlePrice) : '');
    setFeatured(l ? !!l.isFeatured : false);
    setBundleErr('');
    setPicked(
      (l?.items || []).map((it) => ({
        id: it.product?._id || it.product,
        slug: it.product?.slug || '',
        name: it.product?.name ? (lang === 'en' && it.product.name.en ? it.product.name.en : it.product.name.ar) : it.product,
        price: it.product?.price ?? 0,
        salePrice: it.product?.salePrice ?? null,
        qty: it.qty,
      }))
    );
    setQuery(''); setResults([]); setNotice('');
  };

  const addItem = (p) => {
    setPicked((x) => [...x, { id: p._id, slug: p.slug, name: lang === 'en' && p.name?.en ? p.name.en : p.name?.ar, price: p.price, salePrice: p.salePrice ?? null, qty: 1 }]);
    setQuery('');
    setResults([]);
  };

  // Live regular total uses effective (offer) prices, like the server.
  const total = picked.reduce((s, it) => s + effectivePrice(it) * (Number(it.qty) || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    if (picked.length === 0) {
      setError(t('admin.lists.noItems'));
      return;
    }
    // Offer rule mirror (server re-checks with live prices): bundle < regular total.
    const bNum = bundle === '' ? null : Number(bundle);
    if (bNum != null && !(bNum > 0 && bNum < total)) {
      setBundleErr(t('admin.lists.bundleRule', { total: fmt(total) }));
      return;
    }
    setBundleErr('');
    const stripped = findStripped([
      { label: t('admin.lists.titleAr'), value: titleAr },
      { label: t('admin.lists.titleEn'), value: titleEn },
    ]);
    setNotice(stripped.length > 0 ? t('admin.lists.strippedNotice', { fields: stripped.join('، ') }) : '');
    setSaving(true);
    setError('');
    const body = {
      title: { ar: titleAr, en: titleEn },
      school: { ar: schoolAr, en: schoolEn },
      grade: { ar: gradeAr, en: gradeEn },
      items: picked.map((it) => ({ product: it.id, qty: Number(it.qty) || 1 })),
      bundlePrice: bNum,
      isFeatured: featured,
      isActive: active,
    };
    try {
      if (editing && editing._id) await api.put(`/supply-lists/${editing._id}`, body);
      else await api.post('/supply-lists', body);
      setEditing(null);
      void load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map((x) => `${x.field}: ${x.message}`).join(' | ') : t('admin.common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l) => {
    if (!window.confirm(t('admin.common.confirmDelete'))) return;
    try {
      await api.delete(`/supply-lists/${l._id}`);
      void load();
    } catch {
      setError(t('admin.common.deleteFailed'));
    }
  };

  const dispTitle = (l) => (lang === 'en' && l.title?.en ? l.title.en : l.title?.ar);

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="text-sm font-bold text-stone-500">← {t('admin.common.back')}</button>
        <h1 className="text-2xl font-extrabold mt-1">{editing._id ? t('admin.lists.edit') : t('admin.lists.new')}</h1>
        <form onSubmit={save} className="mt-4 space-y-4 bg-white rounded-xl shadow-sm p-5">
          <BilingualField labelAr={t('admin.lists.titleAr')} labelEn={t('admin.lists.titleEn')} valueAr={titleAr} valueEn={titleEn} onAr={setTitleAr} onEn={setTitleEn} hintEn={t('admin.lists.enFallbackHint')} required max={200} />
          <BilingualField labelAr={t('admin.lists.schoolAr')} labelEn={t('admin.lists.schoolEn')} valueAr={schoolAr} valueEn={schoolEn} onAr={setSchoolAr} onEn={setSchoolEn} max={200} />
          <BilingualField labelAr={t('admin.lists.gradeAr')} labelEn={t('admin.lists.gradeEn')} valueAr={gradeAr} valueEn={gradeEn} onAr={setGradeAr} onEn={setGradeEn} max={100} />
          {notice && <p className="text-sm font-bold text-amber-600">{notice}</p>}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            {t('admin.lists.active')}
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            {t('admin.lists.featured')}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold">{t('admin.lists.bundlePrice')}</span>
              <input type="number" min="0" step="any" dir="ltr" value={bundle} onChange={(e) => setBundle(e.target.value)} placeholder={t('admin.lists.bundleHint')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              <span className="block text-xs text-stone-400">{t('admin.lists.bundleHint')}</span>
            </label>
          </div>
          {bundleErr && <p className="text-sm text-red-600 font-bold">{bundleErr}</p>}
          {editing?._id && editing.storedBundlePrice != null && !editing.offerValid && (
            <p className="text-sm font-bold text-amber-600">
              {t('admin.lists.offerInvalid', { total: fmt(editing.regularTotal ?? editing.totalPrice) })}
            </p>
          )}
          <div>
            <span className="text-sm font-bold">{t('admin.lists.productsLabel')}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.lists.searchProduct')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            {results.length > 0 && (
              <ul className="mt-1 rounded-lg border border-stone-200 divide-y">
                {results.map((p) => (
                  <li key={p._id}>
                    <button type="button" onClick={() => addItem(p)} className="w-full text-start px-3 py-2 text-sm hover:bg-stone-50">
                      {(lang === 'en' && p.name?.en ? p.name.en : p.name?.ar)} — {fmt(effectivePrice(p))}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-2 space-y-1">
              {picked.map((it) => (
                <li key={it.id} className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span className="flex-1 font-bold">{it.name}</span>
                  <span className="text-stone-500 whitespace-nowrap">{fmt(effectivePrice(it))} ×</span>
                  <input type="number" min="1" value={it.qty} onChange={(e) => setPicked((x) => x.map((y) => (y.id === it.id ? { ...y, qty: e.target.value } : y)))} className="w-16 rounded border border-stone-300 px-2 py-1" aria-label={t('admin.lists.qty')} />
                  <button type="button" onClick={() => setPicked((x) => x.filter((y) => y.id !== it.id))} className="font-bold text-red-600">{t('admin.common.remove')}</button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-extrabold">{t('admin.lists.total')}: {fmt(total)}</p>
          </div>
          {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 font-bold text-white disabled:opacity-50">{t('admin.common.save')}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-6 py-2 font-bold">{t('admin.common.cancel')}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">{t('admin.lists.title')}</h1>
        <button onClick={() => { reset(null); setEditing({}); }} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white">+ {t('admin.lists.new')}</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 font-bold">{error}</p>}
      {loading ? (
        <p className="py-8 text-center">{t('admin.common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-stone-500">{t('admin.lists.empty')}</p>
      ) : (
        <div className="mt-3 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              {items.map((l) => (
                <tr key={l._id} className="border-b last:border-0">
                  <td className="p-2 font-bold">
                    {dispTitle(l)}
                    {l.isFeatured && <span className="ms-2 rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5">★</span>}
                  </td>
                  <td className="p-2 text-stone-500 whitespace-nowrap">
                    {l.items?.length || 0} ·{' '}
                    {l.offerValid ? (
                      <>
                        <s>{fmt(l.regularTotal)}</s> <span className="font-bold text-brand-600">{fmt(l.bundlePrice)}</span>
                      </>
                    ) : (
                      fmt(l.regularTotal ?? l.totalPrice)
                    )}
                    {l.storedBundlePrice != null && !l.offerValid && (
                      <span className="block text-xs font-bold text-amber-600">
                        {t('admin.lists.offerInvalid', { total: fmt(l.regularTotal ?? l.totalPrice) })}
                      </span>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap text-end">
                    <button onClick={() => { reset(l); setEditing(l); }} className="font-bold text-brand-600 me-3">{t('admin.common.edit')}</button>
                    <button onClick={() => void remove(l)} className="font-bold text-red-600">{t('admin.common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
