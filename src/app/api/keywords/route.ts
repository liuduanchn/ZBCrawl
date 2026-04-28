import { NextRequest, NextResponse } from "next/server";
import { keywordManager } from "@/storage/database/keywordManager";

// GET /api/keywords - 获取关键词列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const isActive = searchParams.get("isActive");

    const keywords = await keywordManager.getKeywords({
      category,
      isActive: isActive ? isActive === "true" : undefined,
    });

    return NextResponse.json({
      success: true,
      data: keywords,
    });
  } catch (error) {
    console.error("获取关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "获取关键词失败" },
      { status: 500 }
    );
  }
}

// POST /api/keywords - 创建关键词
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, isDefault, isActive } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: "关键词名称和分类不能为空" },
        { status: 400 }
      );
    }

    const keyword = await keywordManager.createKeyword({
      name,
      category,
      isDefault: isDefault ? 1 : 0,
      isActive: isActive ? 1 : 0,
    });

    return NextResponse.json({
      success: true,
      data: keyword,
    });
  } catch (error) {
    console.error("创建关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "创建关键词失败" },
      { status: 500 }
    );
  }
}
