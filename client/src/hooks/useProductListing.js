import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

const LIMIT = 12;

// Single listing engine for /products, /category/:slug (fixedCategory) and /new.
// - Stale requests are cancelled with AbortController.
// - Typing in search updates the URL with REPLACE (no history spam).
// - Applying filters / changing page uses PUSH (back button works).
// - Previous results stay visible while reloading (skeleton only on first load).
export function readListingParams(sp, fixedCategory) {
  return {
    search: sp.get('search') || '',
    category: fixedCategory || sp.get('category') || '',
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    ageMin: sp.get('ageMin') || '',
    ageMax: sp.get('ageMax') || '',
    inStock: sp.get('inStock') === 'true',
    onSale: sp.get('onSale') === 'true',
    sort: sp.get('sort') || 'newest',
    page: Math.max(1, parseInt(sp.get('page') || '1', 10) || 1),
  };
}

export function countActiveFilters(p, fixedCategory) {
  let n = 0;
  if (p.search) n += 1;
  if (!fixedCategory && p.category) n += 1;
  if (p.minPrice !== '' || p.maxPrice !== '') n += 1;
  if (p.ageMin !== '' || p.ageMax !== '') n += 1;
  if (p.inStock) n += 1;
  if (p.onSale) n += 1;
  return n;
}

export function useProductListing({ fixedCategory = '', newOnly = false } = {}) {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => readListingParams(sp, fixedCategory), [sp, fixedCategory]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const q = {
      search: params.search || undefined,
      category: params.category || undefined,
      minPrice: params.minPrice === '' ? undefined : params.minPrice,
      maxPrice: params.maxPrice === '' ? undefined : params.maxPrice,
      ageMin: params.ageMin === '' ? undefined : params.ageMin,
      ageMax: params.ageMax === '' ? undefined : params.ageMax,
      inStock: params.inStock ? 'true' : undefined,
      onSale: params.onSale ? 'true' : undefined,
      sort: params.sort === 'newest' ? undefined : params.sort,
      page: params.page,
      limit: LIMIT,
      ...(newOnly ? { isNewArrival: 'true' } : {}),
    };
    api
      .get('/products', { params: q, signal: ctrl.signal })
      .then((r) => {
        setItems(r.data.data);
        setTotal(r.data.total);
        setPages(Math.max(1, r.data.pages));
      })
      .catch((e) => {
        if (e.code !== 'ERR_CANCELED' && e.name !== 'CanceledError') {
          setItems([]);
          setTotal(0);
          setPages(1);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [params, fixedCategory, newOnly]);

  const write = useCallback(
    (patch, replace) => {
      const next = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === undefined || v === null || v === false) next.delete(k);
        else next.set(k, String(v === true ? 'true' : v));
      }
      setSp(next, { replace });
    },
    [sp, setSp]
  );

  // Search typing: REPLACE (change 4).
  const setSearch = useCallback((v) => write({ search: v, page: '1' }, true), [write]);
  // Filter apply + page changes: PUSH (change 4).
  const applyFilters = useCallback((patch) => write({ ...patch, page: '1' }, false), [write]);
  const setPage = useCallback((p) => write({ page: String(p) }, false), [write]);
  const resetAll = useCallback(() => {
    const keep = {};
    if (fixedCategory) keep.category = fixedCategory;
    setSp(new URLSearchParams(keep), { replace: false });
  }, [fixedCategory, setSp]);

  // Data-driven age filter (change 1): visible when products in view carry age ranges.
  const hasAge = useMemo(
    () => items.some((p) => p.ageMin != null || p.ageMax != null) || params.ageMin !== '' || params.ageMax !== '',
    [items, params.ageMin, params.ageMax]
  );

  const activeCount = useMemo(() => countActiveFilters(params, fixedCategory), [params, fixedCategory]);

  return { items, total, pages, params, loading, firstLoad: loading && items.length === 0, hasAge, activeCount, setSearch, applyFilters, setPage, resetAll };
}
