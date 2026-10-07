import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    // 8s grace: after that we stop waiting and the UI stays on locale
    // fallbacks. The shared request itself is never aborted (other
    // components may still be waiting on it).
    let alive = true;
    const timer = setTimeout(() => {
      alive = false;
    }, 8000);
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
      if (alive && s) setSettings(s);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return settings;
}

// Shop display name: StoreSettings.storeName in the current language (EN falls
// back to AR), with the static locale `brand` fallback while settings load.
// Never flashes a stale name — the fallback IS the current shop name.
export function useShopName() {
  const { t, i18n } = useTranslation();
  const settings = useStoreSettings();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  return pickLang(settings?.storeName, cur) || t('brand');
}
