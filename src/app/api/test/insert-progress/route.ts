import { NextRequest, NextResponse } from "next/server";
import { crawlProgressManager } from "@/storage/database";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// 测试插入爬取进度（仅用于测试）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const progress = await crawlProgressManager.createCrawlProgress({
      crawlType: body.crawlType || "tenders",
      schoolName: body.schoolName || null,
      currentIndex: body.currentIndex || 0,
      totalSchools: body.totalSchools || 0,
      status: body.status || "running",
      completedSchools: body.completedSchools || 0,
      failedSchools: body.failedSchools || 0,
      totalCount: body.totalCount || 0,
      lastCrawledAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("插入测试进度失败:", error);
    return NextResponse.json(
      { success: false, error: "插入测试进度失败" },
      { status: 500 }
    );
  }
}
