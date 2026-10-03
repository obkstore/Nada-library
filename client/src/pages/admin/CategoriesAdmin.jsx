import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import BilingualField from '../../components/admin/BilingualField';
import ImageUploader from '../../components/admin/ImageUploader';
import ProductImage from '../../components/ProductImage';
import { findStripped } from '../../utils/stripHtml';

export default function CategoriesAdmin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null=list, {}=new, cat=edit
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/categories');
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

  const openNew = () => {
    setNameAr(''); setNameEn(''); setImage(''); setSortOrder(0); setNotice(''); setEditing({});
  };
  const openEdit = (c) => {
    setNameAr(c.name?.ar || ''); setNameEn(c.name?.en || '');
    setImage(c.image || ''); setSortOrder(c.sortOrder ?? 0); setNotice(''); setEditing(c);
  };

  const save = async (e) => {
    e.preventDefault();
    const stripped = findStripped([
      { label: t('admin.categories.nameAr'), value: nameAr },
      { label: t('admin.categories.nameEn'), value: nameEn },
    ]);
    setNotice(stripped.length > 0 ? t('admin.categories.strippedNotice', { fields: stripped.join('، ') }) : '');
    setSaving(true);
    setError('');
    const body = { name: { ar: nameAr, en: nameEn }, image, sortOrder: Number(sortOrder) || 0 };
    try {
      if (editing && editing._id) await api.put(`/categories/${editing._id}`, body);
      else await api.post('/categories', body);
      setEditing(null);
      void load();
    } catch (err) {
      // Surfaces the server's "in use" message and validation errors verbatim.
      const errs = err.response?.data?.errors;
      setError(err.response?.data?.message && !errs ? err.response.data.message : errs ? errs.map((x) => `${x.field}: ${x.message}`).join(' | ') : t('admin.common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(t('admin.common.confirmDelete'))) return;
    try {
      await api.delete(`/categories/${c._id}`);
      void load();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.common.deleteFailed'));
    }
  };

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="text-sm font-bold text-stone-500">← {t('admin.common.back')}</button>
        <h1 className="text-2xl font-extrabold mt-1">{editing._id ? t('admin.categories.edit') : t('admin.categories.new')}</h1>
        <form onSubmit={save} className="mt-4 space-y-4 bg-white rounded-xl shadow-sm p-5">
          <BilingualField labelAr={t('admin.categories.nameAr')} labelEn={t('admin.categories.nameEn')} valueAr={nameAr} valueEn={nameEn} onAr={setNameAr} onEn={setNameEn} hintEn={t('admin.categories.enFallbackHint')} required max={200} />
          {notice && <p className="text-sm font-bold text-amber-600">{notice}</p>}
          <div>
            <span className="text-sm font-bold">{t('admin.categories.image')}</span>
            <div className="mt-1"><ImageUploader single images={image ? [image] : []} onChange={(v) => setImage(v[0] || '')} /></div>
          </div>
          <label className="block max-w-xs">
            <span className="text-sm font-bold">{t('admin.categories.sortOrder')}</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
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
        <h1 className="text-2xl font-extrabold">{t('admin.categories.title')}</h1>
        <button onClick={openNew} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white">+ {t('admin.categories.new')}</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 font-bold">{error}</p>}
      {loading ? (
        <p className="py-8 text-center">{t('admin.common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-stone-500">{t('admin.categories.empty')}</p>
      ) : (
        <div className="mt-3 overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b last:border-0">
                  <td className="p-2"><ProductImage src={c.image} categorySlug={c.slug} alt="" className="w-10 h-10 rounded" /></td>
                  <td className="p-2 font-bold">{lang === 'en' && c.name?.en ? c.name.en : c.name?.ar}</td>
                  <td className="p-2 text-stone-400" dir="ltr">{c.slug}</td>
                  <td className="p-2 whitespace-nowrap text-end">
                    <button onClick={() => openEdit(c)} className="font-bold text-brand-600 me-3">{t('admin.common.edit')}</button>
                    <button onClick={() => void remove(c)} className="font-bold text-red-600">{t('admin.common.delete')}</button>
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
