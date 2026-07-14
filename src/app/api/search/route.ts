import { NextRequest, NextResponse } from "next/server";

const BRAVE_API_KEY = "BSA64kVLEbmFn1H4F2j2uV87EYt4D1I";
const BRAVE_API_URL = "https://api.search.brave.com/v1/web/search";

// مواقع السيارات السعودية
const SAUDI_CAR_SITES = [
  "haraj.com.sa",
  "sayarat.com",
  "sa.opensooq.com",
  "yallamotor.com",
  "motory.sa",
  "carswitch.com/sa",
  "dubizzle.sa",
];

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

interface SearchResult extends BraveWebResult {
  matchScore: number;
  matchedCriteria: string[];
}

/** استخراج السعر من النص (يدعم ريال، SAR، أرقام مع commas) */
function extractPrice(text: string): number | null {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:ريال|RS|SAR|ر\.س)/i,
    /(?:ريال|RS|SAR|ر\.س)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,
    /السعر[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:﷼)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ""), 10);
    }
  }

  return null;
}

/** استخراج السنة من النص */
function extractYear(text: string): number | null {
  // ابحث عن أنماط السنة: موديل 2024، 2024، سنة 2024، model 2024
  const patterns = [
    /موديل[:\s]*(\d{4})/i,
    /سنة[:\s]*(\d{4})/i,
    /model[:\s]*(\d{4})/i,
    /year[:\s]*(\d{4})/i,
    /\b(20\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1990 && year <= 2030) {
        return year;
      }
    }
  }

  return null;
}

/** التحقق من وجود اللون في النص */
function hasColor(text: string, color: string): boolean {
  if (!color.trim()) return false;

  const colorMap: Record<string, string[]> = {
    أبيض: ["أبيض", "ابيض", "white"],
    أسود: ["أسود", "اسود", "black"],
    أحمر: ["أحمر", "احمر", "red"],
    فضي: ["فضي", "silver"],
    رمادي: ["رمادي", "gray", "grey"],
    أزرق: ["أزرق", "ازرق", "blue"],
    أخضر: ["أخضر", "اخضر", "green"],
    ذهبي: ["ذهبي", "gold"],
    بيج: ["بيج", "beige"],
    برتقالي: ["برتقالي", "orange"],
    بني: ["بني", "brown"],
    كحلي: ["كحلي", "navy"],
    عنابي: ["عنابي", "maroon"],
  };

  const normalizedColor = color.trim();
  const searchTerms = colorMap[normalizedColor] || [normalizedColor];
  const normalizedText = text.toLowerCase();

  return searchTerms.some((term) => normalizedText.includes(term.toLowerCase()));
}

/** بنَاء استعلام Brave مع فلترة المواقع السعودية */
function buildSiteFilterQuery(parts: string[]): string {
  const query = parts.filter(Boolean).join(" ");
  const siteFilters = SAUDI_CAR_SITES.map((site) => `site:${site}`).join(" OR ");
  return `${query} (${siteFilters})`;
}

/** استدعاء Brave Search API */
async function callBraveSearch(query: string): Promise<BraveWebResult[]> {
  const url = `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=20`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Brave search failed for query "${query}": ${res.status} - ${errorText.substring(0, 200)}`);
      throw new Error(`Brave API returned ${res.status}: ${errorText.substring(0, 100)}`);
    }

    const data: BraveSearchResponse = await res.json();
    return data.web?.results || [];
  } catch (e) {
    console.error(`Brave search exception:`, e);
    throw e;
  }
}

/** حساب درجة التطابق للنتيجة */
function computeMatchScore(
  result: BraveWebResult,
  carType: string,
  model: string,
  specs: string,
  color: string,
  minPrice: number | null,
  maxPrice: number | null
): { score: number; criteria: string[] } {
  const combinedText = `${result.title} ${result.description}`;
  let score = 0;
  const criteria: string[] = [];

  const normalizedText = combinedText.toLowerCase();

  // تطابق نوع السيارة
  if (carType.trim()) {
    const carTypeTerms = carType.trim().toLowerCase().split(/\s+/);
    const allMatch = carTypeTerms.every((term) => normalizedText.includes(term));
    if (allMatch) {
      score += 3;
      criteria.push(`نوع: ${carType.trim()}`);
    } else {
      const anyMatch = carTypeTerms.some((term) => normalizedText.includes(term));
      if (anyMatch) {
        score += 1;
        criteria.push(`نوع (جزئي): ${carType.trim()}`);
      }
    }
  }

  // تطابق الموديل
  if (model.trim()) {
    const modelYear = extractYear(combinedText);
    const requestedYear = parseInt(model.trim(), 10);
    if (!isNaN(requestedYear) && modelYear === requestedYear) {
      score += 3;
      criteria.push(`موديل: ${model.trim()}`);
    } else if (normalizedText.includes(model.trim().toLowerCase())) {
      score += 2;
      criteria.push(`موديل: ${model.trim()}`);
    }
  }

  // تطابق المواصفات
  if (specs.trim()) {
    const specsTerms = specs.trim().split(/[،,\s]+/).filter(Boolean);
    const matchedSpecs: string[] = [];
    for (const term of specsTerms) {
      if (normalizedText.includes(term.toLowerCase())) {
        matchedSpecs.push(term);
      }
    }
    if (matchedSpecs.length > 0) {
      score += matchedSpecs.length * 2;
      criteria.push(`مواصفات: ${matchedSpecs.join("، ")}`);
    }
  }

  // تطابق اللون
  if (color.trim() && hasColor(combinedText, color.trim())) {
    score += 3;
    criteria.push(`لون: ${color.trim()}`);
  }

  // تطابق السعر
  if (minPrice || maxPrice) {
    const price = extractPrice(combinedText);
    if (price !== null) {
      const inRange =
        (!minPrice || price >= minPrice) && (!maxPrice || price <= maxPrice);
      if (inRange) {
        score += 3;
        criteria.push(`سعر: ${price.toLocaleString()} ريال`);
      } else {
        score -= 5; // عقوبة للنتائج خارج نطاق السعر
      }
    }
  }

  // بونص للنتائج من مواقع السيارات السعودية
  const resultUrl = result.url.toLowerCase();
  if (SAUDI_CAR_SITES.some((site) => resultUrl.includes(site.toLowerCase()))) {
    score += 1;
  }

  return { score, criteria };
}

/** فلترة حسب السعر */
function filterByPrice(
  results: BraveWebResult[],
  minPrice: number | null,
  maxPrice: number | null
): BraveWebResult[] {
  if (!minPrice && !maxPrice) return results;

  return results.filter((r) => {
    const combinedText = `${r.title} ${r.description}`;
    const price = extractPrice(combinedText);
    if (price === null) return true; // ما قدرنا نستخرج السعر — خلّه يمر
    if (minPrice && price < minPrice) return false;
    if (maxPrice && price > maxPrice) return false;
    return true;
  });
}

/** فلترة حسب الموديل */
function filterByModel(
  results: BraveWebResult[],
  model: string
): BraveWebResult[] {
  if (!model.trim()) return results;

  const requestedYear = parseInt(model.trim(), 10);

  return results.filter((r) => {
    const combinedText = `${r.title} ${r.description}`;
    const resultYear = extractYear(combinedText);

    if (resultYear === null) return true; // ما قدرنا نستخرج السنة — خلّه يمر

    if (!isNaN(requestedYear)) {
      // إذا المستخدم كتب سنة محددة
      return resultYear === requestedYear;
    }

    // إذا المستخدم كتب نص (مثلاً اسم الموديل)
    return combinedText.toLowerCase().includes(model.trim().toLowerCase());
  });
}

/** فلترة حسب اللون */
function filterByColor(
  results: BraveWebResult[],
  color: string
): BraveWebResult[] {
  if (!color.trim()) return results;

  return results.filter((r) => {
    const combinedText = `${r.title} ${r.description}`;
    return hasColor(combinedText, color.trim());
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const carType = (body.carType || "").trim();
    const model = (body.model || "").trim();
    const specs = (body.specs || "").trim();
    const color = (body.color || "").trim();
    const minPrice = body.minPrice ? Number(body.minPrice) : null;
    const maxPrice = body.maxPrice ? Number(body.maxPrice) : null;

    // قبول الحقل القديم query للتوافق مع الإصدارات السابقة
    const legacyQuery = (body.query || "").trim();
    const hasAnyField = carType || model || specs || color || minPrice || maxPrice || legacyQuery;
    if (!hasAnyField) {
      return NextResponse.json(
        { error: "يرجى إدخال كلمات البحث" },
        { status: 400 }
      );
    }

    // بنَاء أجزاء الاستعلام
    const baseParts: string[] = [];
    if (carType) baseParts.push(carType);
    if (legacyQuery && !carType) baseParts.push(legacyQuery);
    if (model) baseParts.push(`موديل ${model}`);
    if (specs) baseParts.push(specs);

    // استعلام 1: مع فلترة المواقع السعودية (النوع + الموديل + المواصفات)
    const query1 = buildSiteFilterQuery(baseParts);

    // استعلام 2: بدون فلترة المواقع (Brave يبحث في كل المواقع)
    const query2 = baseParts.filter(Boolean).join(" ");

    // استعلام 3: النوع + اللون + "جديد" (للبحث عن سيارات الوكالة)
    const dealershipParts: string[] = [];
    if (carType) dealershipParts.push(carType);
    if (color) dealershipParts.push(color);
    dealershipParts.push("جديد");
    const query3 = buildSiteFilterQuery(dealershipParts);

    // إرسال الاستعلامات بالتوازي
    const queries = [
      { name: "q1", query: query1 },
      { name: "q2", query: query2 },
      { name: "q3", query: query3 },
    ].filter((q) => q.query.trim().length > 0);

    console.log(`🔍 Running ${queries.length} parallel queries:`, queries);

    const resultsArrays = await Promise.all(
      queries.map((q) => callBraveSearch(q.query))
    );

    // دمج النتائج وإزالة التكرارات حسب URL
    const seenUrls = new Set<string>();
    const mergedResults: BraveWebResult[] = [];

    for (const arr of resultsArrays) {
      for (const result of arr) {
        const normalizedUrl = result.url.toLowerCase().replace(/\/+$/, "");
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          mergedResults.push(result);
        }
      }
    }

    console.log(
      `📊 Merged ${resultsArrays.reduce((sum, arr) => sum + arr.length, 0)} results into ${mergedResults.length} unique results`
    );

    // فلترة ذكية
    let filteredResults = mergedResults;

    // فلترة حسب السعر (صارمة)
    if (minPrice || maxPrice) {
      filteredResults = filterByPrice(filteredResults, minPrice, maxPrice);
    }

    // فلترة حسب الموديل (متساهلة — تمرر إذا ما قدرنا نستخرج السنة)
    if (model) {
      filteredResults = filterByModel(filteredResults, model);
    }

    // فلترة حسب اللون
    if (color) {
      filteredResults = filterByColor(filteredResults, color);
    }

    // حساب درجة التطابق وترتيب النتائج
    const scoredResults: SearchResult[] = filteredResults.map((r) => {
      const { score, criteria } = computeMatchScore(
        r,
        carType,
        model,
        specs,
        color,
        minPrice,
        maxPrice
      );
      return {
        ...r,
        matchScore: score,
        matchedCriteria: criteria,
      };
    });

    // ترتيب حسب درجة التطابق (الأعلى أولاً)
    scoredResults.sort((a, b) => b.matchScore - a.matchScore);

    // إزالة حقل matchScore من النتيجة النهائية (لا نحتاجه في الواجهة)
    const finalResults = scoredResults.map(({ title, url, description }) => ({
      title,
      url,
      description: description || "",
    }));

    return NextResponse.json({
      results: finalResults,
      totalResults: finalResults.length,
      beforeFilter: mergedResults.length,
      afterFilter: finalResults.length,
      filtersApplied: {
        price: !!(minPrice || maxPrice),
        model: !!model,
        color: !!color,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي. حاولي مرة أخرى." },
      { status: 500 }
    );
  }
}
