"use client";

import { useState, FormEvent } from "react";
import SearchResults from "./components/SearchResults";

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

export default function Home() {
  const [carType, setCarType] = useState("");
  const [model, setModel] = useState("");
  const [specs, setSpecs] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [color, setColor] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<SearchStats | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSearched(true);
    setStats(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carType: carType.trim() || null,
          model: model.trim() || null,
          specs: specs.trim() || null,
          color: color.trim() || null,
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || "حدث خطأ في البحث. حاولي مرة أخرى."
        );
      }

      const data = await res.json();
      setResults(data.results || []);
      setStats({
        totalResults: data.totalResults || data.results?.length || 0,
        beforeFilter: data.beforeFilter || 0,
        afterFilter: data.afterFilter || 0,
        filtersApplied: data.filtersApplied || {
          price: false,
          model: false,
          color: false,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع. حاولي مرة أخرى."
      );
      setResults([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const buildDisplayQuery = (): string => {
    const parts: string[] = [];
    if (carType.trim()) parts.push(carType.trim());
    if (model.trim()) parts.push(`موديل ${model.trim()}`);
    if (specs.trim()) parts.push(specs.trim());
    if (color.trim()) parts.push(color.trim());
    return parts.join(" ") || "سيارة";
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blush-light/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gold-pale/30 blur-3xl" />
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-rose-pale/15 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-deep-rose mb-4">
            بحث السيارات <span className="inline-block animate-bounce">✨</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-rose max-w-xl mx-auto leading-relaxed">
            محرك بحثكِ الشخصي للسيارات في السعودية. اكتبي النوع والمواصفات
            وسنجد لكِ أفضل النتائج.
          </p>
          <div className="divider-rose mx-auto mt-6" />
        </header>

        {/* Search Form Card */}
        <div className="card-feminine p-6 sm:p-8 mb-10">
          <form onSubmit={handleSearch} className="space-y-5">
            {/* Car Type */}
            <div>
              <label
                htmlFor="carType"
                className="block text-sm font-semibold text-deep-rose mb-2"
              >
                🚗 نوع السيارة
              </label>
              <input
                id="carType"
                type="text"
                value={carType}
                onChange={(e) => setCarType(e.target.value)}
                placeholder='مثال: "كامري"، "لاندكروزر"، "أكسنت"'
                className="w-full px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
              />
            </div>

            {/* Model */}
            <div>
              <label
                htmlFor="model"
                className="block text-sm font-semibold text-deep-rose mb-2"
              >
                📅 الموديل
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder='مثال: "2024"، "2025"'
                className="w-full px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
              />
            </div>

            {/* Specs */}
            <div>
              <label
                htmlFor="specs"
                className="block text-sm font-semibold text-deep-rose mb-2"
              >
                ⚙️ المواصفات
              </label>
              <input
                id="specs"
                type="text"
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder='مثال: "فتحة سقف، كاميرا خلفية، مثبت سرعة"'
                className="w-full px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-semibold text-deep-rose mb-2">
                💰 نطاق السعر (ريال)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="من"
                  className="flex-1 px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
                />
                <span className="flex items-center text-muted-rose font-medium px-2">
                  —
                </span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="إلى"
                  className="flex-1 px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label
                htmlFor="color"
                className="block text-sm font-semibold text-deep-rose mb-2"
              >
                🎨 اللون
              </label>
              <input
                id="color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder='مثال: "أبيض"، "أسود"، "أحمر"'
                className="w-full px-4 py-3 rounded-2xl border border-muted-light bg-surface text-deep-rose placeholder-muted-rose/60 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose-light transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-fem w-full py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.985]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  جاري البحث...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  🔍 بحث
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {searched && (
          <SearchResults
            results={results}
            loading={loading}
            error={error}
            query={buildDisplayQuery()}
            stats={stats}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 text-muted-rose text-sm">
        <p>صُنع بـ 💗 لـ رباب</p>
      </footer>
    </div>
  );
}
