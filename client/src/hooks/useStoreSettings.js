import { useEffect, useState } from 'react';
import api from '../api/client';

let cached = null;
let inflight = null;

// Store settings, fetched once and shared. `pick` returns the bilingual value
// in the current language with Arabic fallback (EN empty → AR).
export function pickLang(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (lang === 'en' && obj.en) return obj.en;
  return obj.ar || '';
}

export function useStoreSettings() {
  const [settings, setSettings] = useState(cached);

  useEffect(() => {
    if (cached) {
      setSettings(cached);
      return;
    }
    if (!inflight) {
      inflight = api
        .get('/settings')
        .then((r) => {
          cached = r.data;
          return cached;
        })
        .catch(() => null)
        .finally(() => {
          inflight = null;
        });
    }
    inflight.then((s) => {
      if (s) setSettings(s);
    });
  }, []);

  return settings;
}
