import { NextRequest, NextResponse } from "next/server";
import { tenderManager } from "@/storage/database";

// 获取招标信息列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const schoolName = searchParams.get("schoolName") || undefined;

    const filters: { schoolName?: string } = {};
    if (schoolName) {
      filters.schoolName = schoolName;
    }

    const tenders = await tenderManager.getTenders({ skip, limit, filters });
    const total = await tenderManager.getTenderCount(filters);

    return NextResponse.json({
      success: true,
      data: tenders,
      total,
    });
  } catch (error) {
    console.error("获取招标信息列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取招标信息列表失败" },
      { status: 500 }
    );
  }
}

// 删除招标信息
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolName = searchParams.get("schoolName");

    if (!schoolName) {
      return NextResponse.json(
        { success: false, error: "学校名称不能为空" },
        { status: 400 }
      );
    }

    const count = await tenderManager.deleteTendersBySchool(schoolName);

    return NextResponse.json({
      success: true,
      message: `成功删除 ${count} 条招标信息`,
    });
  } catch (error) {
    console.error("删除招标信息失败:", error);
    return NextResponse.json(
      { success: false, error: "删除招标信息失败" },
      { status: 500 }
    );
  }
}
