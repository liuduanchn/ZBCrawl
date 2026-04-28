import { NextRequest, NextResponse } from "next/server";
import { crawlHistoryManager } from "@/storage/database";

// 明确指定使用 Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取爬取历史记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "50");
    const crawlType = searchParams.get("crawlType") || undefined;

    const histories = await crawlHistoryManager.getCrawlHistories({
      skip,
      limit,
      crawlType,
    });

    const total = await crawlHistoryManager.getCrawlHistoryCount(crawlType);

    return NextResponse.json({
      success: true,
      data: histories,
      total,
    });
  } catch (error) {
    console.error("获取爬取历史记录失败:", error);
    return NextResponse.json(
      { success: false, error: "获取爬取历史记录失败" },
      { status: 500 }
    );
  }
}

// 创建爬取历史记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const history = await crawlHistoryManager.createCrawlHistory({
      crawlType: body.crawlType || "tenders",
      regions: body.regions || null,
      totalSchools: body.totalSchools || 0,
      successSchools: body.successSchools || 0,
      failedSchools: body.failedSchools || 0,
      tenderCount: body.tenderCount || 0,
      tenderData: body.tenderData || null,
      duration: body.duration || null,
      errorMessage: body.errorMessage || null,
      startedAt: new Date(body.startedAt) || new Date(),
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
    });

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("创建爬取历史记录失败:", error);
    return NextResponse.json(
      { success: false, error: "创建爬取历史记录失败" },
      { status: 500 }
    );
  }
}
