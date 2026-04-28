import { NextRequest, NextResponse } from "next/server";
import { keywordManager } from "@/storage/database/keywordManager";

// GET /api/keywords/[id] - 获取单个关键词
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const keyword = await keywordManager.getKeywordById(id);
    if (!keyword) {
      return NextResponse.json(
        { success: false, error: "关键词不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyword,
    });
  } catch (error) {
    console.error("获取关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "获取关键词失败" },
      { status: 500 }
    );
  }
}

// PUT /api/keywords/[id] - 更新关键词
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const keyword = await keywordManager.updateKeyword(id, body);
    if (!keyword) {
      return NextResponse.json(
        { success: false, error: "关键词不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyword,
    });
  } catch (error) {
    console.error("更新关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "更新关键词失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/keywords/[id] - 删除关键词
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await keywordManager.deleteKeyword(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "关键词不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除关键词失败:", error);
    return NextResponse.json(
      { success: false, error: "删除关键词失败" },
      { status: 500 }
    );
  }
}
