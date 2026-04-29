import { NextRequest, NextResponse } from "next/server";
import { keywordManager } from "@/storage/database/keywordManager";

interface InitKeywordsPayload {
  category?: string;
  keywords?: string[];
}

// POST /api/keywords/init - 初始化默认关键词
export async function POST(request: NextRequest) {
  try {
    let payload: InitKeywordsPayload = {};

    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const category = payload.category || "search";
    const keywords =
      Array.isArray(payload.keywords) && payload.keywords.length > 0
        ? payload.keywords
        : undefined;

    await keywordManager.initDefaultKeywords(category, keywords);

    return NextResponse.json({
      success: true,
      message: "默认关键词初始化成功",
    });
  } catch (error) {
    console.error("初始化默认关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "初始化默认关键词失败" },
      { status: 500 }
    );
  }
}
