import { NextRequest, NextResponse } from "next/server";
import { excludedDomainManager } from "@/storage/database/excludedDomainManager";

export const runtime = "nodejs";

// DELETE /api/excluded-domains/[id] - 删除域名
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少域名ID" },
        { status: 400 }
      );
    }

    const success = await excludedDomainManager.deleteDomain(id);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: "删除成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "域名不存在" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("删除域名失败:", error);
    return NextResponse.json(
      { success: false, error: "删除域名失败" },
      { status: 500 }
    );
  }
}
