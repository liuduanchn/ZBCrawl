import { NextRequest, NextResponse } from "next/server";
import { schoolManager } from "@/storage/database";

// 获取单个学校
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const school = await schoolManager.getSchoolById(id);

    if (!school) {
      return NextResponse.json(
        { success: false, error: "学校不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error("获取学校详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取学校详情失败" },
      { status: 500 }
    );
  }
}

// 更新学校
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      website,
      sequence,
      region,
      schoolType,
      highLevel,
      educationLevel,
      detailUrl,
      crawlSourceUrl,
      crawlSourceName,
    } = body;

    const updatedSchool = await schoolManager.updateSchool(id, {
      name,
      website,
      sequence,
      region,
      schoolType,
      highLevel,
      educationLevel,
      detailUrl,
      crawlSourceUrl,
      crawlSourceName,
    });

    if (!updatedSchool) {
      return NextResponse.json(
        { success: false, error: "学校不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSchool,
    });
  } catch (error) {
    console.error("更新学校失败:", error);
    return NextResponse.json(
      { success: false, error: "更新学校失败" },
      { status: 500 }
    );
  }
}

// 删除学校
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await schoolManager.deleteSchool(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "学校不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除学校失败:", error);
    return NextResponse.json(
      { success: false, error: "删除学校失败" },
      { status: 500 }
    );
  }
}
