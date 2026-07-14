import { NextRequest, NextResponse } from "next/server";

const BRAVE_API_KEY = "BSA64kVLEbmFn1H4F2j2uV87EYt4D1I";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  profile?: {
    name: string;
    long_name: string;
    url: string;
    img?: string;
  };
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let query = body.query || "";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال كلمات البحث" },
        { status: 400 }
      );
    }

    // Append Saudi car site filters
    query = `${query} (site:haraj.com.sa OR site:sayarat.com OR site:sa.opensooq.com)`;

    const url = `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=15`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      console.error("Brave API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "تعذر الاتصال بمحرك البحث. حاولي مرة أخرى لاحقاً." },
        { status: 502 }
      );
    }

    const data: BraveSearchResponse = await res.json();

    const results = (data.web?.results || []).map((r: BraveWebResult) => ({
      title: r.title,
      url: r.url,
      description: r.description || "",
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي. حاولي مرة أخرى." },
      { status: 500 }
    );
  }
}
