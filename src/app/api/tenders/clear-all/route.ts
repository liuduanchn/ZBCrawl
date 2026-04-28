import { NextRequest, NextResponse } from "next/server";
import { tenderManager } from "@/storage/database";
import { getDb } from "coze-coding-dev-sdk";
import { tenders } from "@/storage/database/shared/schema";

// 清空所有招标信息
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.delete(tenders);

    const deletedCount = result.rowCount ?? 0;

    return NextResponse.json({
      success: true,
      message: `成功清空 ${deletedCount} 条招标信息`,
    });
  } catch (error) {
    console.error("清空招标信息失败:", error);
    return NextResponse.json(
      { success: false, error: "清空招标信息失败" },
      { status: 500 }
    );
  }
}
