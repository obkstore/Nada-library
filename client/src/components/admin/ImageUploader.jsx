import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
let nextId = 1;

// Immediate per-file uploader: each selected file POSTs to /api/upload right
// away (one request per file) with progress / error / retry states.
// Parent keeps only the returned URLs; first URL = main image. Removal only
// drops the URL from state — server deletes the file after a successful save
// (abandoned uploads are swept by scripts/cleanup-orphans.js).
export default function ImageUploader({ images = [], onChange, single = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [pending, setPending] = useState([]); // [{ id, name, progress, error }]

  const startUpload = async (entry) => {
    setPending((p) => p.map((x) => (x.id === entry.id ? { ...x, progress: 0, error: '' } : x)));
    const form = new FormData();
    form.append('images', entry.file);
    try {
      const res = await api.post('/upload', form, {
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setPending((p) => p.map((x) => (x.id === entry.id ? { ...x, progress: pct } : x)));
        },
      });
      const url = res.data?.[0]?.url;
      if (!url) throw new Error('no-url');
      setPending((p) => p.filter((x) => x.id !== entry.id));
      onChange(single ? [url] : [...images, url]);
    } catch (err) {
      const msg = err.response?.data?.message || t('admin.products.uploadFailed');
      setPending((p) => p.map((x) => (x.id === entry.id ? { ...x, error: msg } : x)));
    }
  };

  const onSelect = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = ''; // allow re-selecting the same file
    const entries = [];
    for (const file of files) {
      if (single && (images.length > 0 || entries.length > 0)) break;
      const entry = { id: nextId++, file, name: file.name, progress: 0, error: '' };
      if (!ALLOWED.includes(file.type)) entry.error = t('admin.products.uploadTypeError');
      else if (file.size > MAX_SIZE) entry.error = t('admin.products.uploadSizeError');
      entries.push(entry);
    }
    if (entries.length === 0) return;
    setPending((p) => [...p, ...entries]);
    entries.filter((x) => !x.error).forEach((x) => void startUpload(x));
  };

  const move = (i, dir) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url + i} className="relative w-24">
            <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-stone-200" />
            {i === 0 && (
              <span className="absolute top-1 start-1 rounded bg-brand-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                {t('admin.common.main')}
              </span>
            )}
            <div className="mt-1 flex items-center justify-center gap-1">
              {!single && (
                <>
                  <button type="button" onClick={() => move(i, -1)} className="px-1.5 rounded border text-sm" aria-label="←">‹</button>
                  <button type="button" onClick={() => move(i, 1)} className="px-1.5 rounded border text-sm" aria-label="→">›</button>
                </>
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, x) => x !== i))}
                className="px-1.5 rounded border text-sm text-red-600"
              >
                {t('admin.common.remove')}
              </button>
            </div>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.id} className="w-24 rounded-lg border border-dashed border-stone-300 p-1 text-center">
            <div className="text-[11px] truncate">{p.name}</div>
            {p.error ? (
              <>
                <div className="text-[11px] text-red-600">{p.error}</div>
                <button type="button" onClick={() => void startUpload(p)} className="text-xs font-bold text-brand-600">
                  {t('admin.common.retry')}
                </button>
              </>
            ) : (
              <>
                <div className="h-1.5 rounded bg-stone-200 mt-1">
                  <div className="h-1.5 rounded bg-brand-500" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="text-[11px] text-stone-500">{t('admin.common.uploading')} {p.progress}%</div>
              </>
            )}
          </div>
        ))}
      </div>
      {(!single || images.length === 0) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-bold hover:bg-stone-50"
        >
          {t('admin.common.add')}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={!single} onChange={onSelect} className="hidden" />
    </div>
  );
}
