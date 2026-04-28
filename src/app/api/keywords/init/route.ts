import { NextRequest, NextResponse } from "next/server";
import { keywordManager } from "@/storage/database/keywordManager";

// POST /api/keywords/init - 初始化默认关键词
export async function POST(request: NextRequest) {
  try {
    await keywordManager.initDefaultKeywords();

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
