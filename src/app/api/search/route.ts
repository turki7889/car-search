import { NextRequest, NextResponse } from "next/server";

const BRAVE_API_KEY = "BSA64kVLEbmFn1H4F2j2uV87EYt4D1I";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

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

/** استخراج السعر من النص (يدعم ريال، SAR، أرقام مع commas) */
function extractPrice(text: string): number | null {
  // ابحث عن نمط: رقم + ريال/RS/SAR
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

/** فلترة النتائج حسب نطاق السعر */
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let query = body.query || "";
    const minPrice = body.minPrice ? Number(body.minPrice) : null;
    const maxPrice = body.maxPrice ? Number(body.maxPrice) : null;

    if (!query.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال كلمات البحث" },
        { status: 400 }
      );
    }

    // Ensure Saudi car site filters
    if (!query.includes("site:")) {
      query = `${query} (site:haraj.com.sa OR site:sayarat.com OR site:sa.opensooq.com)`;
    }

    const url = `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=20`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "تعذر الاتصال بمحرك البحث. حاولي مرة أخرى لاحقاً." },
        { status: 502 }
      );
    }

    const data: BraveSearchResponse = await res.json();
    let results = (data.web?.results || []).map((r: BraveWebResult) => ({
      title: r.title,
      url: r.url,
      description: r.description || "",
    }));

    // فلترة حسب السعر
    if (minPrice || maxPrice) {
      const beforeCount = results.length;
      results = filterByPrice(results, minPrice, maxPrice);
      
      return NextResponse.json({ 
        results,
        filtered: true,
        beforeFilter: beforeCount,
        afterFilter: results.length,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي. حاولي مرة أخرى." },
      { status: 500 }
    );
  }
}
