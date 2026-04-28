import { NextRequest, NextResponse } from "next/server";
import { crawlHistoryManager } from "@/storage/database";

// 明确指定使用 Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取单个爬取历史记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await crawlHistoryManager.getCrawlHistoryById(id);

    if (!history) {
      return NextResponse.json(
        { success: false, error: "历史记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("获取爬取历史记录失败:", error);
    return NextResponse.json(
      { success: false, error: "获取爬取历史记录失败" },
      { status: 500 }
    );
  }
}

// 更新爬取历史记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const history = await crawlHistoryManager.updateCrawlHistory(id, body);

    if (!history) {
      return NextResponse.json(
        { success: false, error: "历史记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("更新爬取历史记录失败:", error);
    return NextResponse.json(
      { success: false, error: "更新爬取历史记录失败" },
      { status: 500 }
    );
  }
}

// 删除爬取历史记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await crawlHistoryManager.deleteCrawlHistory(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "历史记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除爬取历史记录失败:", error);
    return NextResponse.json(
      { success: false, error: "删除爬取历史记录失败" },
      { status: 500 }
    );
  }
}
