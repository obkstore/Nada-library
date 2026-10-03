import { useEffect, useState } from 'react';
import api from '../api/client';

// Categories (managed, never hardcoded) + bilingual-name picker with AR fallback.
export function useCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let alive = true;
    api
      .get('/categories')
      .then((r) => {
        if (alive) setCategories(r.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return categories;
}

export function pickNameFn(lang) {
  const cur = lang === 'en' ? 'en' : 'ar';
  return (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (cur === 'en' && obj.en) return obj.en;
    return obj.ar || '';
  };
}
