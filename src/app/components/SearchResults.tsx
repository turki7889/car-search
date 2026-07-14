"use client";

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface SearchStats {
  totalResults: number;
  beforeFilter: number;
  afterFilter: number;
  filtersApplied: {
    price: boolean;
    model: boolean;
    color: boolean;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  error: string;
  query: string;
  stats?: SearchStats | null;
}

export default function SearchResults({
  results,
  loading,
  error,
  query,
  stats,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-feminine p-6 animate-pulse">
            <div className="h-5 bg-cream-dark/50 rounded-full w-3/4 mb-3" />
            <div className="h-4 bg-cream-dark/30 rounded-full w-1/2 mb-2" />
            <div className="h-3 bg-cream-dark/20 rounded-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-feminine p-8 text-center">
        <p className="text-xl mb-2">😔</p>
        <p className="text-deep-rose font-medium">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="card-feminine p-10 text-center">
        <p className="text-5xl mb-4">🚗💨</p>
        <h3 className="text-xl font-semibold text-deep-rose mb-2">
          لم نجد نتائج
        </h3>
        <p className="text-muted-rose">
          لم نعثر على نتائج مطابقة لبحثكِ. جربي تغيير الكلمات أو تقليل المعايير.
        </p>
      </div>
    );
  }

  // إنشاء قائمة الفلاتر المطبقة
  const activeFilters: string[] = [];
  if (stats?.filtersApplied) {
    if (stats.filtersApplied.price) activeFilters.push("💰 السعر");
    if (stats.filtersApplied.model) activeFilters.push("📅 الموديل");
    if (stats.filtersApplied.color) activeFilters.push("🎨 اللون");
  }

  const wasFiltered =
    stats && stats.beforeFilter > 0 && stats.afterFilter !== stats.beforeFilter;

  return (
    <section className="space-y-4">
      {/* إحصائيات النتائج */}
      <div className="card-feminine p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-rose">
          <span className="font-semibold text-deep-rose">
            {results.length}
          </span>{" "}
          نتيجة لـ{" "}
          <span className="font-medium text-deep-rose">&quot;{query}&quot;</span>
        </p>

        {wasFiltered && (
          <p className="text-xs text-muted-rose/80">
            (تمت فلترة{" "}
            <span className="font-medium text-gold">
              {stats.beforeFilter - stats.afterFilter}
            </span>{" "}
            نتيجة من أصل{" "}
            <span className="font-medium">{stats.beforeFilter}</span>)
          </p>
        )}
      </div>

      {/* الفلاتر النشطة */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, i) => (
            <span
              key={i}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blush-light/30 text-deep-rose border border-rose-light/30"
            >
              {filter}
            </span>
          ))}
        </div>
      )}

      {/* قائمة النتائج */}
      {results.map((result, index) => (
        <a
          key={index}
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-feminine block p-5 sm:p-6 transition-all hover:border-rose-light hover:shadow-[0_2px_8px_rgba(196,113,122,0.1),0_12px_28px_rgba(196,113,122,0.08)] hover:-translate-y-0.5"
        >
          <h3 className="text-lg font-semibold text-deep-rose mb-2 leading-snug group-hover:text-rose transition-colors">
            {result.title}
          </h3>
          {result.description && (
            <p className="text-muted-rose text-sm leading-relaxed mb-2 line-clamp-3">
              {result.description}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-gold font-medium mt-1">
            🔗 {new URL(result.url).hostname}
          </span>
        </a>
      ))}
    </section>
  );
}
