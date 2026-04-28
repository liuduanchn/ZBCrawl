import { NextRequest, NextResponse } from "next/server";
import { crawlProgressManager } from "@/storage/database";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// 暂停爬取（通过设置数据库中的状态）
export async function POST(request: NextRequest) {
  try {
    const progress = await crawlProgressManager.getCrawlProgress("tenders");

    if (!progress) {
      return NextResponse.json(
        { success: false, error: "没有正在进行的爬取任务" },
        { status: 400 }
      );
    }

    if (progress.status !== "running") {
      return NextResponse.json(
        { success: false, error: "当前没有正在运行的爬取任务" },
        { status: 400 }
      );
    }

    await crawlProgressManager.updateCrawlProgress(progress.id, {
      status: "paused",
      errorMessage: "用户手动暂停",
      lastCrawledAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "暂停指令已发送，等待当前学校爬取完成...",
    });
  } catch (error) {
    console.error("暂停爬取失败:", error);
    return NextResponse.json(
      { success: false, error: "暂停爬取失败" },
      { status: 500 }
    );
  }
}

// 获取暂停状态
export async function GET() {
  try {
    const progress = await crawlProgressManager.getCrawlProgress("tenders");

    return NextResponse.json({
      success: true,
      paused: progress?.status === "paused" || false,
      status: progress?.status,
    });
  } catch (error) {
    console.error("获取暂停状态失败:", error);
    return NextResponse.json(
      { success: false, error: "获取暂停状态失败" },
      { status: 500 }
    );
  }
}

// 恢复爬取（重置暂停状态）
export async function DELETE() {
  try {
    const progress = await crawlProgressManager.getCrawlProgress("tenders");

    if (!progress) {
      return NextResponse.json(
        { success: false, error: "没有爬取进度记录" },
        { status: 400 }
      );
    }

    if (progress.status !== "paused") {
      return NextResponse.json(
        { success: false, error: "当前没有暂停的爬取任务" },
        { status: 400 }
      );
    }

    await crawlProgressManager.updateCrawlProgress(progress.id, {
      status: "running",
      errorMessage: null,
      lastCrawledAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "爬取已恢复",
    });
  } catch (error) {
    console.error("恢复爬取失败:", error);
    return NextResponse.json(
      { success: false, error: "恢复爬取失败" },
      { status: 500 }
    );
  }
}
