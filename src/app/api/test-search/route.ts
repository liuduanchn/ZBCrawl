import { NextRequest, NextResponse } from "next/server";
import { searchWebBatch } from "@/lib/search/searchWebBatch";
import { normalizeSearchProvider } from "@/lib/search/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = normalizeSearchProvider(searchParams.get("provider"));
    const query =
      searchParams.get("query") ||
      "\u6df1\u5733\u804c\u4e1a\u6280\u672f\u5927\u5b66 \u57f9\u8bad \u62db\u6807";
    const count = parseInt(searchParams.get("count") || "10", 10);

    const response = await searchWebBatch({
      queries: [query],
      count,
      provider,
    });

    return NextResponse.json({
      success: true,
      provider,
      query,
      count: response.web_items.length,
      results: response.web_items.map((item, index) => ({
        index: index + 1,
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        siteName: item.site_name,
      })),
      errors: response.errors,
    });
  } catch (error) {
    console.error("Search test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        name: (error as Error).name,
      },
      { status: 500 },
    );
  }
}
