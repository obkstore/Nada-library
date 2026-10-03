import { useEffect, useRef } from 'react';
import ProductCard from './ProductCard';
import Filters, { FilterSidebar } from './Filters';
import Pagination from './Pagination';
import { SkeletonGrid, EmptyResults } from './States';

// Shared results view: toolbar + desktop sidebar + grid + pagination.
// Scrolls to the grid top whenever the page changes (change 5).
export default function ListingView({ listing, categories, fixedCategory, pickName, onSearch, onApply, onReset, onPage }) {
  const { items, total, pages, params, loading, firstLoad, hasAge, activeCount } = listing;
  const topRef = useRef(null);
  const prevPage = useRef(params.page);

  useEffect(() => {
    if (params.page !== prevPage.current) {
      prevPage.current = params.page;
      topRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [params.page]);

  return (
    <div ref={topRef} className="scroll-mt-24">
      <Filters
        params={params}
        activeCount={activeCount}
        total={total}
        categories={categories}
        fixedCategory={fixedCategory}
        hasAge={hasAge}
        onSearch={onSearch}
        onApply={onApply}
        onReset={onReset}
        pickName={pickName}
      />
      <div className="mt-4 flex gap-4 items-start">
        <FilterSidebar params={params} categories={categories} fixedCategory={fixedCategory} hasAge={hasAge} onApply={onApply} pickName={pickName} />
        <div className="flex-1 min-w-0">
          {firstLoad ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyResults onClear={onReset} />
          ) : (
            <>
              <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${loading ? 'opacity-60' : ''}`}>
                {items.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              <Pagination page={params.page} pages={pages} onPage={onPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
