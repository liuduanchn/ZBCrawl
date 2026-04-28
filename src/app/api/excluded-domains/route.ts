import { NextRequest, NextResponse } from "next/server";
import { excludedDomainManager } from "@/storage/database/excludedDomainManager";

export const runtime = "nodejs";

// GET /api/excluded-domains - 获取排除域名列表
export async function GET() {
  try {
    const domains = await excludedDomainManager.getAllDomains();
    return NextResponse.json({
      success: true,
      data: domains,
    });
  } catch (error) {
    console.error("获取排除域名列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取排除域名列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/excluded-domains - 批量添加域名
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 支持两种格式：
    // 1. { domains: ["domain1", "domain2"] } - 数组
    // 2. { text: "domain1\ndomain2\ndomain3" } - 多行文本
    let domains: string[] = [];

    if (body.domains && Array.isArray(body.domains)) {
      domains = body.domains;
    } else if (body.text && typeof body.text === "string") {
      // 按换行分割
      domains = body.text.split(/\r?\n/).filter((line: string) => line.trim());
    } else {
      return NextResponse.json(
        { success: false, error: "请提供 domains 数组或 text 文本" },
        { status: 400 }
      );
    }

    if (domains.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要添加的域名" },
        { status: 400 }
      );
    }

    const result = await excludedDomainManager.addDomainsBatch(domains);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("批量添加域名失败:", error);
    return NextResponse.json(
      { success: false, error: "批量添加域名失败" },
      { status: 500 }
    );
  }
}
