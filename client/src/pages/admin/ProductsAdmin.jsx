import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import BilingualField from '../../components/admin/BilingualField';
import BilingualTextarea from '../../components/admin/BilingualTextarea';
import ImageUploader from '../../components/admin/ImageUploader';
import ProductImage from '../../components/ProductImage';
import { findStripped } from '../../utils/stripHtml';
import { formatPrice } from '../../utils/formatPrice';
import { useStoreSettings } from '../../hooks/useStoreSettings';

const PAGE_SIZE = 12;

function emptyForm() {
  return {
    nameAr: '', nameEn: '', descAr: '', descEn: '',
    price: '', salePrice: '', category: '', stockStatus: 'in', stockQty: 0,
    ageMin: '', ageMax: '', isNewArrival: false, images: [],
  };
}

export default function ProductsAdmin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ar';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null=list, {}=new, product=edit
  const [form, setForm] = useState(emptyForm());
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saleErr, setSaleErr] = useState('');
  const settings = useStoreSettings();

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/products', { params: { search: debounced || undefined, page, limit: PAGE_SIZE } });
      setItems(res.data.data);
      setTotal(res.data.total);
      setPages(Math.max(1, res.data.pages));
    } catch {
      setError(t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [debounced, page, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const openNew = () => {
    setForm(emptyForm());
    setNotice('');
    setEditing({});
  };
  const openEdit = (p) => {
    setForm({
      nameAr: p.name?.ar || '', nameEn: p.name?.en || '',
      descAr: p.description?.ar || '', descEn: p.description?.en || '',
      price: p.price ?? '', salePrice: p.salePrice ?? '', category: p.category?._id || p.category || '',
      stockStatus: p.stockStatus || 'in', stockQty: p.stockQty ?? 0,
      ageMin: p.ageMin ?? '', ageMax: p.ageMax ?? '',
      isNewArrival: !!p.isNewArrival, images: p.images || [],
    });
    setNotice('');
    setEditing(p);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    // Offer rule mirror (server re-checks with merged values): empty clears,
    // otherwise 0 < sale < price.
    const raw = String(form.salePrice ?? '').trim();
    const sNum = raw === '' ? null : Number(raw);
    if (sNum != null && !(sNum > 0 && sNum < Number(form.price))) {
      setSaleErr(t('admin.products.saleRule'));
      return;
    }
    setSaleErr('');
    // Warn when the server will strip HTML (client mirror of the same rule).
    const stripped = findStripped([
      { label: t('admin.products.nameAr'), value: form.nameAr },
      { label: t('admin.products.nameEn'), value: form.nameEn },
      { label: t('admin.products.descAr'), value: form.descAr },
      { label: t('admin.products.descEn'), value: form.descEn },
    ]);
    setNotice(stripped.length > 0 ? t('admin.products.strippedNotice', { fields: stripped.join('، ') }) : '');
    setSaving(true);
    setError('');
    // NOTE: slug is NEVER sent — server generates it once on creation.
    // NOTE: salePrice null clears the offer (server treats null/'' as no offer).
    const body = {
      name: { ar: form.nameAr, en: form.nameEn },
      description: { ar: form.descAr, en: form.descEn },
      price: Number(form.price),
      salePrice: sNum,
      category: form.category,
      stockStatus: form.stockStatus,
      stockQty: Number(form.stockQty) || 0,
      isNewArrival: !!form.isNewArrival,
      images: form.images,
      ...(form.ageMin === '' ? {} : { ageMin: Number(form.ageMin) }),
      ...(form.ageMax === '' ? {} : { ageMax: Number(form.ageMax) }),
    };
    try {
      if (editing && editing._id) await api.put(`/products/${editing._id}`, body);
      else await api.post('/products', body);
      setEditing(null);
      void load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map((x) => `${x.field}: ${x.message}`).join(' | ') : t('admin.common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(t('admin.common.confirmDelete'))) return;
    try {
      await api.delete(`/products/${p._id}`);
      void load();
    } catch {
      setError(t('admin.common.deleteFailed'));
    }
  };

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${lang}/products/${editing.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const dispName = (p) => (lang === 'en' && p.name?.en ? p.name.en : p.name?.ar);

  if (editing) {
    const isEdit = !!editing._id;
    return (
      <div>
        <button onClick={() => setEditing(null)} className="text-sm font-bold text-stone-500">← {t('admin.common.back')}</button>
        <h1 className="text-2xl font-extrabold mt-1">{isEdit ? t('admin.products.edit') : t('admin.products.new')}</h1>
        <form onSubmit={save} className="mt-4 space-y-4 bg-white rounded-xl shadow-sm p-5">
          <BilingualField labelAr={t('admin.products.nameAr')} labelEn={t('admin.products.nameEn')} valueAr={form.nameAr} valueEn={form.nameEn} onAr={(v) => set('nameAr', v)} onEn={(v) => set('nameEn', v)} hintEn={t('admin.products.enFallbackHint')} required max={200} />
          <BilingualTextarea labelAr={t('admin.products.descAr')} labelEn={t('admin.products.descEn')} valueAr={form.descAr} valueEn={form.descEn} onAr={(v) => set('descAr', v)} onEn={(v) => set('descEn', v)} hintEn={t('admin.products.enFallbackHint')} required max={500} />
          {notice && <p className="text-sm font-bold text-amber-600">{notice}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.price')}</span>
              <input type="number" min="0" step="any" required dir="ltr" value={form.price} onChange={(e) => set('price', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.salePrice')}</span>
              <input type="number" min="0" step="any" dir="ltr" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} placeholder={t('admin.products.saleHint')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              <span className="block text-xs text-stone-400">{t('admin.products.saleHint')}</span>
            </label>
            {saleErr && <p className="text-sm text-red-600 font-bold md:col-span-3">{saleErr}</p>}
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.category')}</span>
              <select required value={form.category} onChange={(e) => set('category', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                <option value="">{t('admin.products.selectCategory')}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{lang === 'en' && c.name?.en ? c.name.en : c.name?.ar}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.stockStatus')}</span>
              <select value={form.stockStatus} onChange={(e) => set('stockStatus', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                <option value="in">{t('admin.products.inStock')}</option>
                <option value="out">{t('admin.products.outStock')}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.stockQty')}</span>
              <input type="number" min="0" value={form.stockQty} onChange={(e) => set('stockQty', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.ageMin')}</span>
              <input type="number" min="0" max="18" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} placeholder={t('admin.products.ageHint')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-bold">{t('admin.products.ageMax')}</span>
              <input type="number" min="0" max="18" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} placeholder={t('admin.products.ageHint')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.isNewArrival} onChange={(e) => set('isNewArrival', e.target.checked)} />
            {t('admin.products.newArrival')}
          </label>
          <div>
            <span className="text-sm font-bold">{t('admin.products.images')}</span>
            <p className="text-xs text-stone-400">{t('admin.products.imagesHint')}</p>
            <div className="mt-1"><ImageUploader images={form.images} onChange={(v) => set('images', v)} /></div>
          </div>
          {isEdit && (
            <div>
              <span className="text-sm font-bold">{t('admin.products.slugLabel')}</span>
              <div className="mt-1 flex items-center gap-2">
                <code dir="ltr" className="flex-1 truncate rounded-lg bg-stone-100 px-3 py-2 text-sm">{editing.slug}</code>
                <button type="button" onClick={copySlug} className="rounded-lg border px-3 py-2 text-sm font-bold">
                  {copied ? t('admin.common.copied') : t('admin.common.copy')}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 font-bold text-white disabled:opacity-50">
              {t('admin.common.save')}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-6 py-2 font-bold">
              {t('admin.common.cancel')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">{t('admin.products.title')} ({total})</h1>
        <button onClick={openNew} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white">
          + {t('admin.products.new')}
        </button>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('admin.common.search')}
        className="mt-3 w-full max-w-sm rounded-lg border border-stone-300 px-3 py-2"
      />
      {error && <p className="mt-2 text-sm text-red-600 font-bold">{error}</p>}
      {loading ? (
        <p className="py-8 text-center">{t('admin.common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-stone-500">{t('admin.products.empty')}</p>
      ) : (
        <div className="mt-3 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="p-2"></th>
                <th className="p-2 text-start">{t('admin.products.nameAr')}</th>
                <th className="p-2 text-start">{t('admin.products.price')}</th>
                <th className="p-2 text-start">{t('admin.products.stockStatus')}</th>
                <th className="p-2 text-start">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-b last:border-0">
                  <td className="p-2"><ProductImage src={p.images?.[0]} categorySlug={p.category?.slug || ''} alt="" className="w-10 h-10 rounded" /></td>
                  <td className="p-2 font-bold">{dispName(p)}{p.isNewArrival ? ' 🆕' : ''}</td>
                  <td className="p-2 whitespace-nowrap">
                    {p.salePrice != null && p.salePrice > 0 ? (
                      <>
                        <s className="me-1 text-stone-400">{formatPrice(p.price, settings, lang)}</s>
                        <span className="font-bold text-red-600">{formatPrice(p.salePrice, settings, lang)}</span>
                      </>
                    ) : (
                      formatPrice(p.price, settings, lang)
                    )}
                  </td>
                  <td className="p-2">{p.stockStatus === 'in' ? t('admin.products.inStock') : t('admin.products.outStock')}</td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="font-bold text-brand-600 me-3">{t('admin.common.edit')}</button>
                    <button onClick={() => void remove(p)} className="font-bold text-red-600">{t('admin.common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="rounded border px-3 py-1 disabled:opacity-40">{t('admin.common.prev')}</button>
        <span>{t('admin.common.pageOf', { page, pages })}</span>
        <button disabled={page >= pages} onClick={() => setPage((x) => x + 1)} className="rounded border px-3 py-1 disabled:opacity-40">{t('admin.common.next')}</button>
      </div>
    </div>
  );
}
